#!/usr/bin/env python3
"""
Ingest .txt documents into the ChromaDB vector store using sentence-transformers.

Workflow:
    1. python -m backend.scripts.pdf_to_txt   # convert PDFs once
    2. python -m backend.scripts.ingest        # index them

Usage:
    python -m backend.scripts.ingest
    python -m backend.scripts.ingest --docs-dir backend/docs --clear
"""
import argparse
import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import chromadb
from sentence_transformers import SentenceTransformer

from backend.config import CHROMA_PATH, EMBED_MODEL

CHUNK_TARGET  = 600
CHUNK_OVERLAP = 100
MIN_CHUNK_LEN = 60
UPSERT_BATCH  = 500

_RE_PAGE_MARKER = re.compile(r'^--- Page (\d+) ---$', re.MULTILINE)


# ── Text loading ───────────────────────────────────────────────────────────────

def load_txt(path: Path) -> list[tuple[int, str]]:
    content = path.read_text(encoding='utf-8', errors='ignore')
    markers = list(_RE_PAGE_MARKER.finditer(content))
    if not markers:
        return [(1, content.strip())]
    pages = []
    for i, m in enumerate(markers):
        page_num = int(m.group(1))
        start = m.end()
        end   = markers[i + 1].start() if i + 1 < len(markers) else len(content)
        text  = content[start:end].strip()
        if len(text) >= MIN_CHUNK_LEN:
            pages.append((page_num, text))
    return pages


# ── Chunking ───────────────────────────────────────────────────────────────────

def _sentence_split(text: str) -> list[str]:
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]


def chunk_text(text: str) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]
    units: list[str] = []
    for para in paragraphs:
        if len(para) <= CHUNK_TARGET:
            units.append(para)
        else:
            units.extend(_sentence_split(para))

    chunks: list[str] = []
    buf: list[str] = []
    buf_len = 0
    for unit in units:
        unit_len = len(unit)
        if buf_len + unit_len + 1 > CHUNK_TARGET and buf_len >= MIN_CHUNK_LEN:
            chunks.append(' '.join(buf))
            tail, tail_len = [], 0
            for s in reversed(buf):
                if tail_len + len(s) + 1 > CHUNK_OVERLAP:
                    break
                tail.insert(0, s)
                tail_len += len(s) + 1
            buf, buf_len = tail, tail_len
        buf.append(unit)
        buf_len += unit_len + 1
    if buf_len >= MIN_CHUNK_LEN:
        chunks.append(' '.join(buf))
    return chunks


# ── Main ───────────────────────────────────────────────────────────────────────

def ingest(docs_dir: Path, clear: bool = False) -> None:
    txt_files = sorted(docs_dir.glob('*.txt'))
    if not txt_files:
        print(f'No .txt files found in {docs_dir}')
        print('Run:  python -m backend.scripts.pdf_to_txt  first.')
        sys.exit(1)

    print(f'Loading model: {EMBED_MODEL} ...', end=' ', flush=True)
    model = SentenceTransformer(EMBED_MODEL)
    print('ready')

    chroma_path = Path(CHROMA_PATH)
    chroma_path.mkdir(parents=True, exist_ok=True)
    db = chromadb.PersistentClient(path=str(chroma_path))

    if clear:
        try:
            db.delete_collection('udsm_docs')
            print('Cleared existing collection.')
        except Exception:
            pass

    collection = db.get_or_create_collection(
        'udsm_docs', metadata={'hnsw:space': 'cosine'}
    )

    grand_total = 0

    for file_path in txt_files:
        source = file_path.name
        print(f'\n{"─"*60}')
        print(f'File   : {source}  ({file_path.stat().st_size // 1024} KB)')

        pages = load_txt(file_path)
        print(f'Pages  : {len(pages)}')

        all_chunks: list[tuple[str, int]] = []
        for page_num, page_text in pages:
            for chunk in chunk_text(page_text):
                all_chunks.append((chunk, page_num))

        n = len(all_chunks)
        print(f'Chunks : {n}')
        if n == 0:
            continue

        texts = [c[0] for c in all_chunks]
        print(f'  Embedding...', end=' ', flush=True)
        embeddings = model.encode(
            texts,
            batch_size=64,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        print('done')

        ids, embs, docs_list, metas = [], [], [], []
        for idx, ((chunk, page_num), emb) in enumerate(zip(all_chunks, embeddings)):
            chunk_id = hashlib.md5(f'{source}:{idx}:{chunk[:80]}'.encode()).hexdigest()
            ids.append(chunk_id)
            embs.append(emb.tolist())
            docs_list.append(chunk)
            metas.append({'source': source, 'page': page_num})

        stored = 0
        for i in range(0, len(ids), UPSERT_BATCH):
            collection.upsert(
                ids=ids[i : i + UPSERT_BATCH],
                embeddings=embs[i : i + UPSERT_BATCH],
                documents=docs_list[i : i + UPSERT_BATCH],
                metadatas=metas[i : i + UPSERT_BATCH],
            )
            stored += len(ids[i : i + UPSERT_BATCH])

        grand_total += stored
        print(f'  Stored {stored}/{n} chunks')

    print(f'\n{"="*60}')
    print(f'Run total  : {grand_total} chunks')
    print(f'Store total: {collection.count()} chunks')
    print(f'Location   : {chroma_path.resolve()}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--docs-dir', default='backend/docs')
    parser.add_argument('--clear', action='store_true',
                        help='Delete existing collection before ingesting')
    args = parser.parse_args()
    ingest(Path(args.docs_dir), clear=args.clear)
