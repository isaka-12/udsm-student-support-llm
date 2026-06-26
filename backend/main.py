from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import httpx
import json
import os
import re
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="UDSM Student Support Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LLM_MODEL   = os.getenv("LLM_MODEL",   "phi3:latest")
LLM_API_URL = os.getenv("LLM_API_URL", "http://localhost:11434/api/chat")

MAX_HISTORY    = 20  # total messages kept server-side
CONTEXT_WINDOW = 8   # messages sent to model per request

chat_history: list[dict] = []

# ── System prompt ──────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are UDSM Assistant — the official student support chatbot for the University of Dar es Salaam (UDSM), Tanzania's oldest and largest public university, located at Mlimani Campus, Dar es Salaam. Motto: Wisdom is Freedom. Website: udsm.ac.tz

SCOPE — answer questions about:
• Admissions & applications (undergraduate, postgraduate, direct entry, foreign students)
• Academic programmes, colleges, schools, and departments
• Course registration, add/drop, deferral, and transfers
• Examinations, results, academic regulations, and graduation
• Fees, tuition structure, HESLB loans, and payment methods
• Student portal (ARIS), ICT services, and e-learning
• Library services, research support, and university resources
• Hostels, accommodation applications, and campus facilities
• Student welfare, clubs, health services, and disability support
• Contacts, office locations, and general university information

RESPONSE FORMAT:
• Use Markdown — **bold** key terms, bullet or numbered lists for multi-step info, ## headers for long multi-section answers.
• For processes (registration, payment, application steps) always use a numbered list.
• Be as detailed as the question requires — give complete, useful answers; do not truncate.
• Never repeat the student's question. Never use filler like "Great question!" or "Certainly!".
• Do not invent specific fees, deadlines, contacts, regulations, or dates.
• If details are unverified: "I don't have confirmed details on that — please check [udsm.ac.tz](https://www.udsm.ac.tz) or visit the relevant office."
• If off-topic: "I'm here to help with UDSM matters only. Is there something about the university I can assist with?"\
"""

# ── Helpers ────────────────────────────────────────────────────────────────────

def _clean_response(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^(Assistant|UDSM Assistant|Answer|Response)\s*:\s*", "", text, flags=re.IGNORECASE)
    return text.strip()


def _build_messages() -> list[dict]:
    system = {"role": "system", "content": SYSTEM_PROMPT}
    turns = [
        {"role": m["role"], "content": m["content"]}
        for m in chat_history[-CONTEXT_WINDOW:]
    ]
    return [system] + turns


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": LLM_MODEL,
        "messages": len(chat_history),
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/ask")
async def ask_question(question_data: dict):
    user_question = (question_data or {}).get("question", "").strip()
    if not user_question:
        return JSONResponse(status_code=400, content={"error": "Question is required"})

    chat_history.append({
        "role": "user",
        "content": user_question,
        "timestamp": datetime.now().isoformat(),
    })
    if len(chat_history) > MAX_HISTORY:
        del chat_history[:len(chat_history) - MAX_HISTORY]

    messages = _build_messages()
    start = time.time()
    collected: list[str] = []

    async def stream():
        try:
            timeout = httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=10.0)

            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST", LLM_API_URL,
                    json={
                        "model": LLM_MODEL,
                        "messages": messages,
                        "stream": True,
                        "options": {
                            "temperature": 0.3,
                            "top_p": 0.9,
                            "repeat_penalty": 1.1,
                            "num_predict": 1000,
                            "num_ctx": 2048,
                        },
                    },
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        token = data.get("message", {}).get("content", "")
                        if token:
                            collected.append(token)
                            yield f"data: {json.dumps({'token': token})}\n\n"

                        if data.get("done"):
                            answer = _clean_response("".join(collected))
                            elapsed = round(time.time() - start, 2)
                            chat_history.append({
                                "role": "assistant",
                                "content": answer,
                                "response_time": elapsed,
                                "timestamp": datetime.now().isoformat(),
                            })
                            yield f"data: {json.dumps({'done': True, 'response_time': elapsed, 'tokens': data.get('eval_count', 0)})}\n\n"

        except httpx.TimeoutException:
            msg = "Model timed out. Try again."
            yield f"data: {json.dumps({'error': msg})}\n\n"
        except httpx.ConnectError:
            msg = "Cannot connect to Ollama. Make sure 'ollama serve' is running."
            yield f"data: {json.dumps({'error': msg})}\n\n"
        except httpx.HTTPStatusError as e:
            msg = f"Ollama returned HTTP {e.response.status_code}"
            yield f"data: {json.dumps({'error': msg})}\n\n"
        except Exception as e:
            msg = str(e)
            yield f"data: {json.dumps({'error': msg})}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/history")
async def get_history():
    return {"count": len(chat_history), "history": chat_history}


@app.delete("/history")
async def clear_history():
    chat_history.clear()
    return {"success": True, "message": "History cleared"}


@app.get("/model-info")
async def model_info():
    return {
        "model": LLM_MODEL,
        "provider": "Ollama",
        "capabilities": ["question-answering", "student-support", "university-guidance"],
    }
