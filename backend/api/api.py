import asyncio
import io
import json
import time
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

import hashlib
import re

from backend import llm_client
from backend.rag import embedder as rag_embedder
from backend.rag import store as rag_store
from backend.auth import (
    create_access_token,
    get_current_user,
    get_optional_user,
    hash_password,
    verify_password,
)
from backend.config import LLM_MODEL, MAX_CONCURRENT, NUM_CTX, MAX_HISTORY, CONTEXT_WINDOW
from backend.database import database as db
from backend.logs.logs import LOG_FILE, logger
from backend.models.auth_modal import AuthResponse, UserCreate, UserLogin
from backend.models.chat import AskRequest, FeedbackRequest
from backend.rag.retriever import retrieve

router = APIRouter()


async def _generate_and_save_title(session_id: str, question: str) -> None:
    try:
        title = await llm_client.generate_title(question)
        if title:
            await db.set_session_title(session_id, title)
    except Exception:
        pass


# ── Auth ───────────────────────────────────────────────────────────────────────

@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate):
    first = body.first_name.strip()
    last  = body.last_name.strip()
    email = body.email.strip().lower()
    if not first or not last:
        raise HTTPException(status_code=422, detail="First and last name are required")
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    if await db.get_user(email):
        raise HTTPException(status_code=409, detail="Email already registered")
    await db.create_user(email, await hash_password(body.password), first, last)
    logger.info("New user registered: %s", email)
    return AuthResponse(
        access_token=create_access_token(email),
        user={"email": email, "first_name": first, "last_name": last},
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(body: UserLogin):
    email = body.email.strip().lower()
    user  = await db.get_user(email)
    if not user or not await verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    logger.info("User logged in: %s", email)
    return AuthResponse(
        access_token=create_access_token(email),
        user={
            "email":      email,
            "first_name": user.get("first_name", ""),
            "last_name":  user.get("last_name", ""),
        },
    )


# ── Health ─────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    sessions = await db.list_sessions()
    return {
        "status": "healthy",
        "model": LLM_MODEL,
        "active_sessions": len(sessions),
        "queued_requests": llm_client.pending_count(),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Chat ───────────────────────────────────────────────────────────────────────

async def _sse_generator(
    session_id: str, messages: list[dict], start: float,
    user_email: str | None = None,
    refs: list[dict] | None = None,
    msg_index: int = 0,
    model_override: str | None = None,
):
    if refs:
        yield f"data: {json.dumps({'refs': refs})}\n\n"

    final_answer  = None
    final_elapsed = 0.0
    final_tokens  = 0

    async for event, data in llm_client.stream(messages, start, model_override=model_override):
        if event == "keepalive":
            yield ": keep-alive\n\n"
        elif event == "token":
            yield f"data: {json.dumps({'token': data})}\n\n"
        elif event == "done":
            payload       = json.loads(data)
            final_answer  = payload["answer"]
            final_elapsed = payload["elapsed"]
            final_tokens  = payload["tokens"]
            yield f"data: {json.dumps({'done': True, 'response_time': final_elapsed, 'tokens': final_tokens, 'message_index': msg_index})}\n\n"
        elif event == "interrupted":
            final_answer = data + " [interrupted]"
        elif event == "error":
            logger.error("LLM error | session=%s | %s", session_id, data)
            yield f"data: {json.dumps({'error': data})}\n\n"

    if final_answer:
        await db.append_message(
            session_id, "assistant", final_answer,
            user_email=user_email,
            response_time=final_elapsed, token_count=final_tokens,
        )
        logger.info(
            "Answer generated | session=%s | tokens=%d | elapsed=%.2fs | answer=%.100s",
            session_id, final_tokens, final_elapsed, final_answer,
        )


@router.post("/ask")
async def ask(req: AskRequest, current_user: dict | None = Depends(get_optional_user)):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    if len(question) > 2000:
        raise HTTPException(status_code=400, detail="Question too long (max 2000 chars)")

    session_id = req.session_id or "default"
    user_email = current_user["email"] if current_user else None
    logger.info("Question received | session=%s | user=%s | q=%.120s", session_id, user_email or "anon", question)

    # DB append (returns the updated history in one round-trip) and RAG
    # retrieval are independent — run them concurrently.
    (history, is_first), (context, refs) = await asyncio.gather(
        db.append_user_message_and_get_history(session_id, question, user_email=user_email),
        retrieve(question),
    )
    if is_first:
        asyncio.create_task(_generate_and_save_title(session_id, question))
    messages         = llm_client.build_messages(history, context, file_context=req.file_context)
    msg_index        = len(history)
    start            = time.time()

    return StreamingResponse(
        _sse_generator(session_id, messages, start, user_email=user_email, refs=refs, msg_index=msg_index, model_override=req.model),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":       "keep-alive",
        },
    )


# ── Quick questions ──────────────────────────────────────────────────────────────

# Generating these calls the LLM, so cache the result instead of paying that
# cost on every homepage load. Invalidated whenever the KB changes (see
# /ingest-file) so suggestions stay grounded in what's actually indexed.
_quick_questions_cache: list[str] = []
_quick_questions_cache_ts: float = 0.0
QUICK_QUESTIONS_TTL = 6 * 3600  # regenerate periodically even without new ingests


@router.get("/quick-questions")
async def get_quick_questions():
    global _quick_questions_cache, _quick_questions_cache_ts
    now = time.time()
    if not _quick_questions_cache or (now - _quick_questions_cache_ts) > QUICK_QUESTIONS_TTL:
        try:
            snippets  = rag_store.sample_snippets(n=6)
            questions = await llm_client.generate_quick_questions(snippets)
            if questions:
                _quick_questions_cache    = questions
                _quick_questions_cache_ts = now
        except Exception as exc:
            logger.warning("quick-questions generation failed: %s", exc)
    return {"questions": _quick_questions_cache}


# ── History ────────────────────────────────────────────────────────────────────

@router.get("/history/{session_id}")
async def get_history(session_id: str):
    messages = await db.get_session_messages(session_id)
    return {"session_id": session_id, "count": len(messages), "history": messages}


@router.delete("/history/{session_id}")
async def clear_history(session_id: str):
    await db.clear_session(session_id)
    return {"success": True, "session_id": session_id, "message": "History cleared"}


@router.delete("/history")
async def clear_all_history():
    count = await db.clear_all_sessions()
    return {"success": True, "sessions_cleared": count}


# ── Sessions ───────────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    sessions = await db.list_sessions(user_email=current_user["email"])
    return {"active_sessions": len(sessions), "sessions": sessions}


# ── Feedback ───────────────────────────────────────────────────────────────────

@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    if not 1 <= req.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be 1–5")

    msg_count = await db.get_session_message_count(req.session_id)
    if req.message_index >= msg_count:
        raise HTTPException(status_code=404, detail="Message not found")

    feedback = {
        "rating":       req.rating,
        "comment":      req.comment,
        "submitted_at": datetime.utcnow().isoformat(),
    }
    await db.update_message_feedback(req.session_id, req.message_index, feedback)
    await db.save_feedback(req.session_id, req.message_index, req.rating, req.comment)
    return {"success": True, "message": "Feedback recorded"}


# ── Available models ───────────────────────────────────────────────────────────

# Embedding-only models (e.g. nomic-embed-text, bge-*, e5-*) can't do chat
# completion — they'd break generation if selected, so keep them out of the
# user-facing model picker.
_RE_EMBEDDING_MODEL = re.compile(r"embed|bge-|(?:^|-)e5-|gte-|minilm", re.IGNORECASE)


@router.get("/models")
async def list_models():
    """List locally available Ollama models capable of chat completion."""
    from backend.config import LLM_API_URL, LLM_MODEL
    base = LLM_API_URL.rsplit("/api/", 1)[0]
    try:
        resp = await llm_client._http_client.get(
            f"{base}/api/tags",
            timeout=httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0),
        )
        resp.raise_for_status()
        models = [
            m["name"] for m in resp.json().get("models", [])
            if not _RE_EMBEDDING_MODEL.search(m["name"])
        ]
        return {"models": models or [LLM_MODEL], "current": LLM_MODEL}
    except Exception:
        return {"models": [LLM_MODEL], "current": LLM_MODEL}


# ── File extraction (temp context) ──────────────────────────────────────────────

@router.post("/extract-file")
async def extract_file(file: UploadFile = File(...)):
    """Extract plain text from a PDF or TXT for temporary chat context."""
    MAX_SIZE = 10 * 1024 * 1024
    filename = file.filename or ""
    ext      = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "txt"):
        raise HTTPException(400, "Only PDF and TXT files are supported")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10 MB)")
    if ext == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        text   = "\n\n".join(p.extract_text() or "" for p in reader.pages)
    else:
        text = content.decode("utf-8", errors="ignore")
    text = text.strip()
    if not text:
        raise HTTPException(400, "Could not extract any text from the file")
    return {"text": text[:6000], "filename": filename, "chars": len(text)}


# ── Knowledge-base ingestion ─────────────────────────────────────────────────────

_RE_HYPHEN = re.compile(r'(\w)-\n(\w)')
_RE_NUM    = re.compile(r'^\s*\d{1,4}\s*$', re.MULTILINE)
_RE_LIST_ITEM = re.compile(
    r'(?=(?:College of|School of|Institute of|Directorate of|Department of|'
    r'Faculty of|Centre for)\s+[A-Z])'
)

CHUNK_TARGET  = 600
CHUNK_OVERLAP = 100
MIN_CHUNK     = 60


def _clean_text(text: str) -> str:
    text = _RE_HYPHEN.sub(r'\1\2', text)
    text = _RE_NUM.sub('', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _hard_wrap(text: str, limit: int) -> list[str]:
    if len(text) <= limit:
        return [text]
    cut = text.rfind(' ', 0, limit)
    if cut <= 0:
        cut = limit
    return [text[:cut].strip()] + _hard_wrap(text[cut:].strip(), limit)


def _split_oversized(unit: str) -> list[str]:
    """Directory/listing text with no sentence punctuation (e.g. 'College
    of X ... College of Y ...') would otherwise stay as one oversized,
    semantically diluted chunk spanning multiple unrelated entities."""
    if len(unit) <= CHUNK_TARGET:
        return [unit]
    parts = [p.strip() for p in _RE_LIST_ITEM.split(unit) if p.strip()]
    if len(parts) > 1:
        out: list[str] = []
        for p in parts:
            out.extend(_split_oversized(p))
        return out
    return _hard_wrap(unit, CHUNK_TARGET)


def _chunk(text: str) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]
    units: list[str] = []
    for para in paragraphs:
        if len(para) <= CHUNK_TARGET:
            units.append(para)
        else:
            for sentence in re.split(r'(?<=[.!?])\s+', para):
                sentence = sentence.strip()
                if sentence:
                    units.extend(_split_oversized(sentence))
    chunks: list[str] = []
    buf: list[str] = []
    buf_len = 0
    for unit in units:
        ul = len(unit)
        if buf_len + ul + 1 > CHUNK_TARGET and buf_len >= MIN_CHUNK:
            chunks.append(' '.join(buf))
            tail, tl = [], 0
            for s in reversed(buf):
                if tl + len(s) + 1 > CHUNK_OVERLAP:
                    break
                tail.insert(0, s); tl += len(s) + 1
            buf, buf_len = tail, tl
        buf.append(unit); buf_len += ul + 1
    if buf_len >= MIN_CHUNK:
        chunks.append(' '.join(buf))
    return chunks


@router.post("/ingest-file")
async def ingest_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Ingest an uploaded PDF or TXT into the ChromaDB knowledge base."""
    MAX_SIZE = 10 * 1024 * 1024
    filename = file.filename or "uploaded_file"
    ext      = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "txt"):
        raise HTTPException(400, "Only PDF and TXT files are supported")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10 MB)")

    # Extract text page-by-page
    if ext == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        pages  = []
        for i, page in enumerate(reader.pages, 1):
            t = _clean_text(page.extract_text() or "")
            if len(t) >= MIN_CHUNK:
                pages.append((i, t))
    else:
        pages = [(1, _clean_text(content.decode("utf-8", errors="ignore")))]

    all_chunks: list[tuple[str, int]] = [
        (chunk, page_num)
        for page_num, page_text in pages
        for chunk in _chunk(page_text)
    ]
    if not all_chunks:
        raise HTTPException(400, "No usable text found in the file")

    # Batch embed using the running ST model
    texts      = [c[0] for c in all_chunks]
    embeddings = await rag_embedder.batch_embed(texts)

    # Upsert to ChromaDB
    ids, embs, docs, metas = [], [], [], []
    for idx, ((chunk, page_num), emb) in enumerate(zip(all_chunks, embeddings)):
        chunk_id = hashlib.md5(f"{filename}:{idx}:{chunk[:80]}".encode()).hexdigest()
        ids.append(chunk_id); embs.append(emb)
        docs.append(chunk); metas.append({"source": filename, "page": page_num})

    await rag_store.upsert(ids, embs, docs, metas)
    logger.info("KB ingest | file=%s | chunks=%d | user=%s", filename, len(ids), current_user.get("email", "?"))

    global _quick_questions_cache_ts
    _quick_questions_cache_ts = 0.0  # force regeneration from the updated KB next time

    return {"chunks": len(ids), "filename": filename}


# ── Model info ─────────────────────────────────────────────────────────────────

@router.get("/model-info")
async def model_info():
    return {
        "model":                    LLM_MODEL,
        "provider":                 "Ollama",
        "context_window":           NUM_CTX,
        "max_history":              MAX_HISTORY,
        "context_sent_per_request": CONTEXT_WINDOW,
        "max_concurrent_inferences": MAX_CONCURRENT,
        "capabilities": ["question-answering", "student-support", "university-guidance"],
    }


# ── Admin: knowledge base + logs ────────────────────────────────────────────────

@router.get("/admin/knowledge-base")
async def get_knowledge_base(current_user: dict = Depends(get_current_user)):
    """List ingested documents and their chunk counts, for the settings UI."""
    sources = rag_store.list_sources()
    return {"total_chunks": sum(s["chunks"] for s in sources), "sources": sources}


_RE_LOG_LINE = re.compile(
    r"^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| "
    r"(?P<level>\w+)\s*\| (?P<logger>\S+) \| (?P<message>.*)$"
)


@router.get("/admin/logs")
async def get_logs(limit: int = 300, current_user: dict = Depends(get_current_user)):
    """Return the most recent parsed log entries (newest first)."""
    if not LOG_FILE.exists():
        return {"entries": []}

    raw_lines = LOG_FILE.read_text(encoding="utf-8", errors="ignore").splitlines()
    entries: list[dict] = []
    for line in raw_lines:
        match = _RE_LOG_LINE.match(line)
        if match:
            entries.append({
                "timestamp": match.group("timestamp"),
                "level":     match.group("level"),
                "logger":    match.group("logger"),
                "message":   match.group("message"),
            })
        elif entries:
            # Continuation line (e.g. a traceback) — fold into the entry it belongs to.
            entries[-1]["message"] += "\n" + line

    entries = entries[-limit:]
    entries.reverse()
    return {"entries": entries}
