import asyncio
from pathlib import Path

import chromadb

from backend.config import CHROMA_PATH
from backend.logs.logs import logger

_collection = None


def _init_sync(path: str):
    client = chromadb.PersistentClient(path=path)
    return client.get_or_create_collection(
        "udsm_docs",
        metadata={"hnsw:space": "cosine"},
    )


async def init() -> None:
    global _collection
    try:
        path = Path(CHROMA_PATH)
        path.mkdir(parents=True, exist_ok=True)
        _collection = await asyncio.to_thread(_init_sync, str(path))
        count = await asyncio.to_thread(_collection.count)
        logger.info("RAG store ready | chunks=%d | path=%s", count, path)
    except Exception as exc:
        logger.warning("RAG store unavailable (RAG disabled): %s", exc)
        _collection = None


async def upsert(
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    if _collection is None:
        return
    await asyncio.to_thread(
        _collection.upsert,
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


async def query(
    embedding: list[float], top_k: int
) -> tuple[list[str], list[dict]]:
    """
    Returns (chunks_for_prompt, refs_for_frontend).
    chunks_for_prompt: formatted strings injected into the system prompt.
    refs_for_frontend: [{"source": filename, "page": int}, ...] deduplicated by source+page.
    """
    if _collection is None:
        return [], []
    count = await asyncio.to_thread(_collection.count)
    if count == 0:
        return [], []
    results = await asyncio.to_thread(
        _collection.query,
        query_embeddings=[embedding],
        n_results=min(top_k, count),
        include=["documents", "metadatas"],
    )
    docs  = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]

    chunks: list[str] = []
    refs:   list[dict] = []
    seen:   set[tuple] = set()

    for doc, meta in zip(docs, metas):
        source = meta.get("source", "UDSM Document")
        page   = meta.get("page", 0)
        label  = f"{source}, p.{page}" if page else source
        chunks.append(f"[{label}]\n{doc}")
        key = (source, page)
        if key not in seen:
            seen.add(key)
            refs.append({"source": source, "page": page})

    return chunks, refs
