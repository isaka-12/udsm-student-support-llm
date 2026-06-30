from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend import llm_client
from backend.api.api import router
from backend.config import CORS_ORIGINS
from backend.database.database import close_db, connect_db
from backend.logs.logs import logger, setup
from backend.rag import embedder as rag_embedder
from backend.rag import store as rag_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup()
    logger.info("Starting UDSM Student Support API")
    await connect_db()
    await llm_client.init()
    await rag_embedder.init()
    await rag_store.init()
    yield
    await llm_client.close()
    await rag_embedder.close()
    await close_db()
    logger.info("Shutdown complete")


app = FastAPI(
    title="UDSM Student Support Assistant",
    version="1.0.0",
    description="AI-powered student support chatbot for the University of Dar es Salaam",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
