import asyncio
import json
import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from backend import llm_client
from backend.auth import (
    create_access_token,
    get_current_user,
    get_optional_user,
    hash_password,
    verify_password,
)
from backend.config import LLM_MODEL, MAX_CONCURRENT, NUM_CTX, MAX_HISTORY, CONTEXT_WINDOW
from backend.database import database as db
from backend.logs.logs import logger
from backend.models.auth_modal import AuthResponse, UserCreate, UserLogin
from backend.models.chat import AskRequest, FeedbackRequest

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
    await db.create_user(email, hash_password(body.password), first, last)
    logger.info("New user registered: %s", email)
    return AuthResponse(
        access_token=create_access_token(email),
        user={"email": email, "first_name": first, "last_name": last},
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(body: UserLogin):
    email = body.email.strip().lower()
    user  = await db.get_user(email)
    if not user or not verify_password(body.password, user["hashed_password"]):
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
):
    final_answer  = None
    final_elapsed = 0.0
    final_tokens  = 0

    async for event, data in llm_client.stream(messages, start):
        if event == "keepalive":
            yield ": keep-alive\n\n"
        elif event == "token":
            yield f"data: {json.dumps({'token': data})}\n\n"
        elif event == "done":
            payload       = json.loads(data)
            final_answer  = payload["answer"]
            final_elapsed = payload["elapsed"]
            final_tokens  = payload["tokens"]
            yield f"data: {json.dumps({'done': True, 'response_time': final_elapsed, 'tokens': final_tokens})}\n\n"
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
    is_first = (await db.get_session_message_count(session_id)) == 0
    await db.append_message(session_id, "user", question, user_email=user_email)
    if is_first:
        asyncio.create_task(_generate_and_save_title(session_id, question))
    history  = await db.get_session_messages(session_id)
    messages = llm_client.build_messages(history)
    start    = time.time()

    return StreamingResponse(
        _sse_generator(session_id, messages, start, user_email=user_email),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":       "keep-alive",
        },
    )


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
