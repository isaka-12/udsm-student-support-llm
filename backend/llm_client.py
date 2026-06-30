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
You are UDSM Assistant, the official student support chatbot for the University of Dar es Salaam.

OUTPUT FORMAT — strict:
- Write only the answer. No labels such as "Answer:", "Question:", "Response:".
- Do not echo or repeat the question.
- Do not include filenames, document names, or page numbers in your answer.
- No greetings, no filler phrases ("certainly", "great question", "of course").

RESPONSE LENGTH:
- Factual (what is, how much, who, when): ONE or TWO sentences maximum.
- Steps (how to, process): numbered list, maximum 5 items.
- Complex (explain, compare): 3 short paragraphs maximum.
- Never pad, elaborate, or add unsolicited advice beyond what was asked.

EXAMPLE — AI policy:
Students may use AI-generated content for up to **30%** of any academic work.

RULES:
- Answer ONLY from the UDSM document context provided. Do not use outside knowledge.
- If the answer is not in the context: That information is not available. Please visit udsm.ac.tz or contact the relevant office.
- Never invent fees, dates, contacts, or regulations.
- If unrelated to UDSM: I only assist with UDSM matters.\
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
    # Strip leading role labels
    text = re.sub(
        r"^(Assistant|UDSM\s+Assistant|Answer|Response)\s*:\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    # Strip "Question: ... Answer:" echo — greedy up to Answer: (handles straight/curly quotes)
    text = re.sub(
        r'^Question\s*:.*?Answer\s*:\s*',
        "",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    # Truncate at second Q&A pair if the model generates multiple
    text = re.sub(
        r'\s*\nQuestion\s*:.*$',
        "",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    # Strip inline file references like (PROSPECTUS_2025-2026.txt p.4)
    text = re.sub(r'\(\s*\S+\.txt\s+p\.?\s*\d+\s*\)', '', text)
    text = re.sub(r'\(\s*p\.?\s*\d+\s*\)', '', text)
    # Clean up extra whitespace left by substitutions
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def build_messages(
    history: list[dict],
    context: list[str] | None = None,
    file_context: str | None = None,
) -> list[dict]:
    system = SYSTEM_PROMPT
    if file_context:
        system += (
            "\n\n---\nUSER-UPLOADED FILE CONTENT:\n\n"
            + file_context[:4000]
            + "\n\n---\nAnswer the question using the above file content where relevant."
        )
    if context:
        system += (
            "\n\n---\nRELEVANT INFORMATION FROM UDSM DOCUMENTS:\n\n"
            + "\n\n".join(context)
            + "\n\n---"
        )
    turns = [
        {"role": m["role"], "content": m["content"]}
        for m in history[-CONTEXT_WINDOW:]
    ]
    return [{"role": "system", "content": system}] + turns


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
    messages: list[dict], start: float, model_override: str | None = None
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
                    "model": model_override or LLM_MODEL,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature":    TEMPERATURE,
                        "top_p":          TOP_P,
                        "repeat_penalty": REPEAT_PENALTY,
                        "num_predict":    NUM_PREDICT,
                        "num_ctx":        NUM_CTX,
                        "stop": [
                            "\nQuestion:", "\nquestion:",
                            "Question:", "question:",
                            "\nExample:", "\nNote:",
                        ],
                    },
                },
            ) as response:
                response.raise_for_status()
                last_ping = time.time()

                # Buffer the first PREAMBLE_SIZE chars to allow prefix-stripping
                # before streaming tokens to the client.
                PREAMBLE_SIZE = 600
                preamble_buf: list[str] = []
                preamble_done = False
                done_payload: dict | None = None

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
                        if not preamble_done:
                            preamble_buf.append(token)
                            if sum(len(t) for t in preamble_buf) >= PREAMBLE_SIZE:
                                clean_start = _clean("".join(preamble_buf))
                                collected.append(clean_start)
                                yield "token", clean_start
                                preamble_done = True
                        else:
                            collected.append(token)
                            yield "token", token

                    if data.get("done"):
                        # Flush any remaining preamble buffer not yet sent
                        if not preamble_done and preamble_buf:
                            clean_start = _clean("".join(preamble_buf))
                            collected.append(clean_start)
                            yield "token", clean_start

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
