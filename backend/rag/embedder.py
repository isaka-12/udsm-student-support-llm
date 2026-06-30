"""
Runtime embedder using sentence-transformers (in-process, no HTTP).
Model is loaded once at startup and reused for all queries.
"""
import asyncio

from sentence_transformers import SentenceTransformer

from backend.config import EMBED_MODEL

_model: SentenceTransformer | None = None


async def init() -> None:
    global _model
    _model = await asyncio.to_thread(_load_model)


def _load_model() -> SentenceTransformer:
    try:
        return SentenceTransformer(EMBED_MODEL, local_files_only=True)
    except Exception:
        return SentenceTransformer(EMBED_MODEL)


async def close() -> None:
    global _model
    _model = None


async def batch_embed(texts: list[str]) -> list[list[float]]:
    if _model is None:
        await init()
    result = await asyncio.to_thread(
        _model.encode,
        texts,
        batch_size=64,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return [v.tolist() for v in result]


async def embed(text: str) -> list[float]:
    if _model is None:
        await init()
    result = await asyncio.to_thread(_model.encode, text, normalize_embeddings=True)
    return result.tolist()
