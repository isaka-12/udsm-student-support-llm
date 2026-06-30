import asyncio
import json
import re
import time
from typing import AsyncGenerator

import httpx

from backend.config import (
    CONTEXT_WINDOW,
    LLM_API_URL,
    LLM_MODEL,
    MAX_CONCURRENT,
    NUM_CTX,
    NUM_PREDICT,
    REPEAT_PENALTY,
    TEMPERATURE,
    TOP_P,
)

SYSTEM_PROMPT = """\
You are UDSM Assistant — the official student support chatbot for the University of \
Dar es Salaam (UDSM), Tanzania's oldest and largest public university, located at \
Mlimani Campus, Dar es Salaam. Motto: Wisdom is Freedom (Hekima ni Uhuru). Website: udsm.ac.tz

SCOPE — answer questions about:
- Admissions & applications (undergraduate, postgraduate, direct entry, foreign students)
- Academic programmes, colleges, schools, and departments
- Course registration, add/drop, deferral, and transfers
- Examinations, results, academic regulations, and graduation
- Fees, tuition structure, HESLB loans, and payment methods
- Student portal (ARIS) aris.udsm.ac.tz, ICT services, and Learning Management System (LMS) lms.udsm.ac.tz
- Library services, research support, and university resources
- Hostels, accommodation applications, and campus facilities
- Student welfare, clubs, health services, and disability support
- Contacts, office locations, and general university information

RESPONSE FORMAT:
- Use Markdown — **bold** key terms, bullet or numbered lists for multi-step info, \
## headers for long multi-section answers.
- For processes (registration, payment, application steps) always use a numbered list.
- Be as detailed as the question requires — give complete, useful answers; do not truncate.
- Never repeat the student's question. Never use filler like "Great question!" or "Certainly!".
- Do not invent specific fees, deadlines, contacts, regulations, or dates.
- If details are unverified: "I don't have confirmed details on that — please check \
[udsm.ac.tz](https://www.udsm.ac.tz) or visit the relevant office."
- If off-topic: "I'm here to help with UDSM matters only. Is there something about \
the university I can assist with?"\
"""

_http_client: httpx.AsyncClient | None = None
_semaphore:   asyncio.Semaphore | None = None


async def init() -> None:
    global _http_client, _semaphore
    _http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=10.0),
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
    )
    _semaphore = asyncio.Semaphore(MAX_CONCURRENT)


async def close() -> None:
    if _http_client:
        await _http_client.aclose()


def pending_count() -> int:
    return MAX_CONCURRENT - _semaphore._value if _semaphore else 0


def _clean(text: str) -> str:
    text = text.strip()
    return re.sub(
        r"^(Assistant|UDSM Assistant|Answer|Response)\s*:\s*",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()


def build_messages(history: list[dict]) -> list[dict]:
    turns = [
        {"role": m["role"], "content": m["content"]}
        for m in history[-CONTEXT_WINDOW:]
    ]
    return [{"role": "system", "content": SYSTEM_PROMPT}] + turns


_TITLE_PREFIX_RE = re.compile(
    r"^(how\s+do\s+i|how\s+can\s+i|what\s+(is|are|does|do)\s+|"
    r"tell\s+me\s+(about|how)\s+|can\s+you\s+|i\s+(want|need)\s+(to|help\s+with)\s+|"
    r"please\s+(explain|tell\s+me)\s+|explain\s+|i\s+'?m\s+)",
    re.IGNORECASE,
)

_TITLE_PROMPT = """\
Given a user question, write a concise 3-5 word chat title. Reply with only the title.

Question: "How do I register for courses at UDSM?"
Title: Course Registration Help

Question: "What are the hostel accommodation requirements?"
Title: Hostel Accommodation Requirements

Question: "I need help with fee payment and HESLB loans"
Title: Fee Payment and HESLB

Question: "What does the academic calendar look like?"
Title: UDSM Academic Calendar

Question: "{q}"
Title:"""


def _fallback_title(question: str) -> str:
    """Word-boundary truncation with common question-prefix removal."""
    q = question.strip().rstrip("?!.")
    q = _TITLE_PREFIX_RE.sub("", q).strip()
    if len(q) > 45:
        q = q[:45].rsplit(" ", 1)[0].strip()
    return q.capitalize() or question[:45].capitalize()


async def generate_title(question: str) -> str:
    """Generate a short session title. Bypasses the semaphore — fire-and-forget only."""
    prompt = _TITLE_PROMPT.format(q=question[:200].replace('"', "'"))
    try:
        resp = await _http_client.post(
            LLM_API_URL,
            json={
                "model":    LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "stream":   False,
                "options":  {
                    "num_predict": 15,
                    "temperature": 0.1,
                    "stop":        ["\n", "Question:", "User:"],
                },
            },
            timeout=httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0),
        )
        resp.raise_for_status()
        raw = (
            resp.json().get("message", {}).get("content", "")
            .split("\n")[0].strip().strip("\"'").rstrip(".,!?;:").strip()
        )
        if raw and 3 <= len(raw) <= 60 and raw.lower() not in {"title", "chat title", "session title"}:
            return raw
    except Exception:
        pass
    return _fallback_title(question)


async def stream(
    messages: list[dict], start: float
) -> AsyncGenerator[tuple[str, str | None], None]:
    """
    Yields (event, data) pairs:
      ("keepalive", None)
      ("token",     token_text)
      ("done",      json with answer/elapsed/tokens)
      ("error",     error_message)
    """
    collected: list[str] = []

    try:
        async with _semaphore:
            yield "keepalive", None

            async with _http_client.stream(
                "POST",
                LLM_API_URL,
                json={
                    "model": LLM_MODEL,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature":    TEMPERATURE,
                        "top_p":          TOP_P,
                        "repeat_penalty": REPEAT_PENALTY,
                        "num_predict":    NUM_PREDICT,
                        "num_ctx":        NUM_CTX,
                    },
                },
            ) as response:
                response.raise_for_status()
                last_ping = time.time()

                async for line in response.aiter_lines():
                    if time.time() - last_ping > 10:
                        yield "keepalive", None
                        last_ping = time.time()

                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    token = data.get("message", {}).get("content", "")
                    if token:
                        collected.append(token)
                        yield "token", token

                    if data.get("done"):
                        answer  = _clean("".join(collected))
                        elapsed = round(time.time() - start, 2)
                        yield "done", json.dumps({
                            "answer":  answer,
                            "elapsed": elapsed,
                            "tokens":  data.get("eval_count", 0),
                        })

    except httpx.TimeoutException:
        yield "error", "Model timed out. Please try again."
    except httpx.ConnectError:
        yield "error", "Cannot connect to Ollama service."
    except httpx.HTTPStatusError as exc:
        yield "error", f"Ollama returned HTTP {exc.response.status_code}"
    except asyncio.CancelledError:
        # client disconnected — yield partial answer for the caller to save
        if collected:
            yield "interrupted", _clean("".join(collected))
        raise
    except Exception as exc:
        yield "error", str(exc)
