import asyncio
import random
import re
from pathlib import Path

import chromadb
from rank_bm25 import BM25Okapi

from backend.config import CHROMA_PATH
from backend.logs.logs import logger

_collection = None
_count_cache = 0

# Keyword index, kept alongside the embedding index. The small embedding
# model (all-MiniLM-L6-v2) ranks broad/structural questions like "what are
# the colleges and schools at UDSM" poorly — it can't reliably separate
# that intent from generic "at UDSM ... course/student" chunks that share
# surface vocabulary. BM25's IDF weighting naturally favors chunks with
# rare, discriminating query terms ("college", "school"), so fusing it
# with the embedding results recovers cases pure ANN search misses.
_bm25:       BM25Okapi | None = None
_bm25_ids:   list[str]  = []
_bm25_docs:  list[str]  = []
_bm25_metas: list[dict] = []

_RE_TOKEN = re.compile(r"[a-z0-9]+")
_RRF_K    = 60  # standard reciprocal-rank-fusion constant


def _stem(token: str) -> str:
    """Crude plural-suffix strip. Without this, query 'colleges'/'schools'
    never matches source text written as singular 'College'/'School',
    since BM25 does exact token matching with no normalization."""
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 4 and token.endswith("es") and not token.endswith(("ss", "us")):
        return token[:-2]
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def _tokenize(text: str) -> list[str]:
    return [_stem(t) for t in _RE_TOKEN.findall(text.lower())]


def _init_sync(path: str):
    client = chromadb.PersistentClient(path=path)
    return client.get_or_create_collection(
        "udsm_docs",
        metadata={"hnsw:space": "cosine"},
    )


def _build_bm25_sync() -> None:
    global _bm25, _bm25_ids, _bm25_docs, _bm25_metas
    data = _collection.get(include=["documents", "metadatas"])
    _bm25_ids   = data["ids"]
    _bm25_docs  = data["documents"]
    _bm25_metas = data["metadatas"]
    _bm25 = BM25Okapi([_tokenize(d) for d in _bm25_docs]) if _bm25_docs else None


_RE_ADMIN_NOISE = re.compile(
    r"Regular Meeting|Committee|Board Meeting|Senate Meeting|Assembly|"
    r"Postal Address|Telefax|P\.\s?O\.\s?BOX",
    re.IGNORECASE,
)


def sample_snippets(n: int = 6) -> list[str]:
    """Pick up to `n` chunks, spread across distinct source documents where
    possible, to ground generated homepage quick-questions in content that
    actually exists in the knowledge base rather than guessed topics.
    Skips chunks that read as internal admin logs (staff meeting schedules,
    committee rosters, address directories) — real content, but not the
    kind of thing a student would ever ask about, which produced awkward
    generated questions when sampled."""
    if not _bm25_docs:
        return []
    by_source: dict[str, list[int]] = {}
    for i, meta in enumerate(_bm25_metas):
        by_source.setdefault(meta.get("source", "?"), []).append(i)

    sources = list(by_source.keys())
    random.shuffle(sources)
    picks: list[str] = []
    for source in sources:
        if len(picks) >= n:
            break
        candidates = by_source[source][:]
        random.shuffle(candidates)
        for idx in candidates[:5]:  # try a few chunks before giving up on this source
            text = _bm25_docs[idx]
            if not _RE_ADMIN_NOISE.search(text):
                picks.append(text)
                break
    return picks


def list_sources() -> list[dict]:
    """Aggregate indexed chunk counts by source document, for the admin UI.
    Reuses the in-memory BM25 metadata (already loaded for search) instead
    of a fresh Chroma query."""
    counts: dict[str, int] = {}
    for meta in _bm25_metas:
        source = meta.get("source", "Unknown")
        counts[source] = counts.get(source, 0) + 1
    return [{"source": s, "chunks": c} for s, c in sorted(counts.items())]


async def init() -> None:
    global _collection, _count_cache
    try:
        path = Path(CHROMA_PATH)
        path.mkdir(parents=True, exist_ok=True)
        _collection = await asyncio.to_thread(_init_sync, str(path))
        _count_cache = await asyncio.to_thread(_collection.count)
        await asyncio.to_thread(_build_bm25_sync)
        logger.info("RAG store ready | chunks=%d | path=%s", _count_cache, path)
    except Exception as exc:
        logger.warning("RAG store unavailable (RAG disabled): %s", exc)
        _collection = None


async def upsert(
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    global _count_cache
    if _collection is None:
        return
    await asyncio.to_thread(
        _collection.upsert,
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )
    # Ingestion is a rare admin action — fine to pay for a fresh count and
    # BM25 rebuild here so the hot query path below never has to.
    _count_cache = await asyncio.to_thread(_collection.count)
    await asyncio.to_thread(_build_bm25_sync)


async def query(
    embedding: list[float], query_text: str, top_k: int
) -> tuple[list[str], list[dict]]:
    """
    Returns (chunks_for_prompt, refs_for_frontend).
    chunks_for_prompt: formatted strings injected into the system prompt.
    refs_for_frontend: [{"source": filename, "page": int}, ...] deduplicated by source+page.

    Hybrid search: fuses embedding (ANN) and BM25 (keyword) rankings via
    Reciprocal Rank Fusion so chunks strong on either signal can surface.
    """
    if _collection is None or _count_cache == 0:
        return [], []

    candidate_n = min(max(top_k * 4, 20), _count_cache)

    ann_results = await asyncio.to_thread(
        _collection.query,
        query_embeddings=[embedding],
        n_results=candidate_n,
        include=["documents", "metadatas"],
    )
    ann_ids   = ann_results.get("ids", [[]])[0]
    ann_docs  = ann_results.get("documents", [[]])[0]
    ann_metas = ann_results.get("metadatas", [[]])[0]

    fused_scores: dict[str, float] = {}
    doc_by_id:    dict[str, tuple[str, dict]] = {}

    for rank, (cid, doc, meta) in enumerate(zip(ann_ids, ann_docs, ann_metas)):
        fused_scores[cid] = fused_scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)
        doc_by_id[cid] = (doc, meta)

    if _bm25 is not None:
        bm25_scores = await asyncio.to_thread(_bm25.get_scores, _tokenize(query_text))
        bm25_ranked = sorted(range(len(bm25_scores)), key=lambda i: -bm25_scores[i])[:candidate_n]
        for rank, idx in enumerate(bm25_ranked):
            if bm25_scores[idx] <= 0:
                break
            cid = _bm25_ids[idx]
            fused_scores[cid] = fused_scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)
            doc_by_id.setdefault(cid, (_bm25_docs[idx], _bm25_metas[idx]))

    ranked_ids = sorted(fused_scores, key=lambda cid: -fused_scores[cid])[:top_k]

    chunks: list[str] = []
    refs:   list[dict] = []
    seen:   set[tuple] = set()

    for cid in ranked_ids:
        doc, meta = doc_by_id[cid]
        source = meta.get("source", "UDSM Document")
        page   = meta.get("page", 0)
        # Don't put source/page labels in text the model sees — it was
        # imitating that citation style in its answers (e.g. "as per
        # policies found in p.465 of...") despite being told not to.
        # The frontend already renders `refs` separately as "Sources".
        chunks.append(doc)
        key = (source, page)
        if key not in seen:
            seen.add(key)
            refs.append({"source": source, "page": page})

    return chunks, refs
