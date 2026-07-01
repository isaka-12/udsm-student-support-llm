from backend.config import RAG_TOP_K
from backend.logs.logs import logger
from backend.rag import embedder, store


async def retrieve(question: str) -> tuple[list[str], list[dict]]:
    """
    Returns (chunks_for_prompt, refs_for_frontend).
    Both are empty lists if RAG is unavailable or no results found.
    """
    try:
        embedding = await embedder.embed(question)
        chunks, refs = await store.query(embedding, question, top_k=RAG_TOP_K)
        if chunks:
            logger.info("RAG | %d chunks | q=%.80s", len(chunks), question)
        return chunks, refs
    except Exception as exc:
        logger.warning("RAG retrieval failed: %s", exc)
        return [], []
