# Backend — UDSM Student Support Assistant

FastAPI application that receives questions from the React frontend, manages user authentication and chat sessions in MongoDB, and streams AI responses from a locally hosted phi3 model via Ollama using Server-Sent Events (SSE).

---

## Folder Structure

```
backend/
│
├── main.py              # App entry point: FastAPI instance, CORS, lifespan
├── config.py            # All environment variable reads with defaults
├── auth.py              # Password hashing, JWT creation/verification, FastAPI dependencies
├── llm_client.py        # Ollama HTTP client, streaming generator, session title generation
│
├── api/
│   └── api.py           # All route handlers (auth, /ask, /history, /sessions, /feedback)
│
├── database/
│   ├── database.py      # Motor async CRUD: sessions, users, feedback collections
│   └── schemas.py       # TypedDicts documenting MongoDB document shapes
│
├── models/
│   ├── auth_modal.py    # Pydantic models: UserCreate, UserLogin, UserOut, AuthResponse
│   └── chat.py          # Pydantic models: AskRequest, FeedbackRequest
│
└── logs/
    ├── logs.py          # Logging setup: stdout + file handler
    └── app.log          # Runtime log file (created on first run)
```

---

## Module Reference

### `main.py`

The application factory. Responsibilities:
- Creates the `FastAPI` instance with title, version, and lifespan
- Registers `CORSMiddleware` (origins controlled by `CORS_ORIGINS` env var)
- Mounts all routes via `app.include_router(router)`
- **Lifespan** (startup/shutdown): calls `setup()` (logging), `connect_db()` (MongoDB + indexes), `llm_client.init()` (httpx client + semaphore); on shutdown closes both

```python
uvicorn backend.main:app --reload --port 8000
```

### `config.py`

Single source of truth for all configuration. Reads from `backend/.env` via `python-dotenv`. Every other module imports from here — nothing reads `os.environ` directly.

| Variable | Default | Used by |
|---|---|---|
| `LLM_MODEL` | `phi3:latest` | `llm_client`, `api` |
| `LLM_API_URL` | `http://localhost:11434/api/chat` | `llm_client` |
| `MAX_HISTORY` | `20` | `database` |
| `CONTEXT_WINDOW` | `10` | `llm_client` |
| `NUM_CTX` | `4096` | `llm_client` |
| `NUM_PREDICT` | `1000` | `llm_client` |
| `MAX_CONCURRENT` | `3` | `llm_client` |
| `CORS_ORIGINS` | `*` | `main` |
| `MONGODB_URL` | *(see `.env.example`)* | `database` |
| `MONGODB_DB` | `udsm_db` | `database` |
| `SESSION_TTL_DAYS` | `7` | `database` |
| `SECRET_KEY` | `change-me-in-production` | `auth` |
| `ALGORITHM` | `HS256` | `auth` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | `auth` |

### `auth.py`

Handles all authentication logic. Does **not** define routes — routes live in `api/api.py`.

| Symbol | Type | Purpose |
|---|---|---|
| `pwd_context` | `CryptContext` | bcrypt password hashing / verification |
| `bearer_scheme` | `HTTPBearer` | Extracts `Authorization: Bearer <token>` header |
| `hash_password(password)` | function | Returns bcrypt hash |
| `verify_password(plain, hashed)` | function | Constant-time comparison |
| `create_access_token(email)` | function | Issues a signed JWT with `exp` claim |
| `get_current_user(credentials)` | FastAPI dependency | Decodes JWT, fetches user from DB, raises 401 on failure |
| `get_optional_user(credentials)` | FastAPI dependency | Same as above but returns `None` instead of raising — used by `/ask` so unauthenticated requests still work |

**Why bcrypt 4.0.1?** passlib 1.7.4 (the standard bcrypt wrapper) is incompatible with bcrypt 5.0.0 — the newer version raises `ValueError` during a hash-detection check that passlib does not catch. Pinned to `bcrypt==4.0.1` in `requirements.txt`.

### `llm_client.py`

All communication with Ollama. Module-level state (initialised by `init()`, closed by `close()`):

| Symbol | Purpose |
|---|---|
| `_http_client` | `httpx.AsyncClient` — shared connection pool to Ollama (connect 10 s, read 120 s) |
| `_semaphore` | `asyncio.Semaphore(MAX_CONCURRENT)` — limits simultaneous inferences |
| `SYSTEM_PROMPT` | Scopes the model to UDSM topics; defines response format rules |

Key functions:

**`build_messages(history)`** — takes the last `CONTEXT_WINDOW` messages from DB history and prepends the system prompt. Returns an Ollama-compatible `messages` list.

**`stream(messages, start)`** — async generator. Acquires the semaphore, streams from Ollama with `stream: True`, and yields typed events:

| Event | Data |
|---|---|
| `"keepalive"` | `None` — sent every 10 s to prevent proxy timeout |
| `"token"` | Token text string |
| `"done"` | JSON with `answer`, `elapsed`, `tokens` |
| `"interrupted"` | Partial answer when client disconnects |
| `"error"` | Error message string |

**`generate_title(question)`** — called as a fire-and-forget background task on the first message of a new session. Uses a few-shot prompt with `num_predict: 15` and `stop` tokens to generate a 3–6 word session title. Falls back to `_fallback_title()` (prefix-stripping + word-boundary truncation) if the model output is unusable.

### `api/api.py`

All route definitions on `router = APIRouter()`. Groups:

#### Auth routes

| Method | Path | Request body | Response |
|---|---|---|---|
| `POST` | `/auth/register` | `UserCreate` (first_name, last_name, email, password) | `AuthResponse` (access_token + user) |
| `POST` | `/auth/login` | `UserLogin` (email, password) | `AuthResponse` |

Register validates: non-empty first/last name, password ≥ 8 chars, email not already taken.

#### Chat routes

**`POST /ask`** — main inference endpoint.

1. Validates question (non-empty, ≤ 2000 chars)
2. Resolves `user_email` from optional JWT
3. Logs the received question
4. Checks if this is the session's first message (`is_first`) → fires `_generate_and_save_title()` as a background task if so
5. Appends user message to MongoDB
6. Loads session history → builds Ollama message list
7. Returns `StreamingResponse` wrapping `_sse_generator()`

**`_sse_generator()`** — consumes `llm_client.stream()`, wraps each event in SSE format (`data: {...}\n\n`), saves the complete assistant answer to MongoDB when done, logs the answer.

| Method | Path | Description |
|---|---|---|
| `GET` | `/history/{session_id}` | Returns all messages for a session |
| `DELETE` | `/history/{session_id}` | Deletes the session document |
| `DELETE` | `/history` | Deletes all session documents |
| `GET` | `/sessions` | Returns authenticated user's sessions with title + message count |

#### Utility routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Status, model name, active session count, queue depth |
| `GET` | `/model-info` | Model config and capabilities list |
| `POST` | `/feedback` | Save a 1–5 star rating for a specific message index |

### `database/database.py`

Motor async CRUD layer. All functions call `get_db()` (returns `_client[MONGODB_DB]`) — the client is created once in `connect_db()` at startup.

**Startup indexes created by `connect_db()`:**

| Collection | Index | Type |
|---|---|---|
| `sessions` | `session_id` | Unique |
| `sessions` | `last_used` | TTL — documents expire after `SESSION_TTL_DAYS × 86400` seconds |
| `sessions` | `user_email` | Regular — speeds up per-user session queries |
| `users` | `email` | Unique |

**Key functions:**

| Function | Description |
|---|---|
| `append_message(session_id, role, content, user_email, **meta)` | Atomic `$push/$slice` — appends message and enforces `MAX_HISTORY` limit in one operation; sets `user_email` and `last_used` |
| `get_session_messages(session_id)` | Returns the `messages` array for a session |
| `get_session_message_count(session_id)` | Returns message count (used to detect first message) |
| `list_sessions(user_email)` | Aggregation pipeline: filters by user, extracts first user message as fallback title, prefers stored `title` field, sorts by `last_used` desc |
| `set_session_title(session_id, title)` | Sets `title` only if the field does not yet exist (`$exists: False`) |
| `clear_session(session_id)` | Deletes the session document |
| `create_user(email, hashed_password, first_name, last_name)` | Inserts new user document |
| `get_user(email)` | Returns user document (excludes `_id`) |
| `save_feedback(session_id, message_index, rating, comment)` | Inserts feedback document; `update_message_feedback` also embeds it in the message |

### `database/schemas.py`

`TypedDict` definitions documenting the shape of MongoDB documents. Not enforced at runtime — used for developer reference and type-checking.

### `models/auth_modal.py`

Pydantic request/response models for authentication:

| Model | Fields |
|---|---|
| `UserCreate` | `first_name`, `last_name`, `email`, `password` |
| `UserLogin` | `email`, `password` |
| `UserOut` | `email`, `first_name`, `last_name` |
| `AuthResponse` | `access_token`, `token_type="bearer"`, `user: UserOut` |
| `TokenData` | `email` (extracted from JWT payload) |

### `models/chat.py`

| Model | Fields | Defaults |
|---|---|---|
| `AskRequest` | `question: str`, `session_id: str` | `session_id = "default"` |
| `FeedbackRequest` | `session_id`, `message_index`, `rating: int`, `comment: str` | `comment = ""` |

### `logs/logs.py`

Sets up dual-output logging on first call to `setup()`. Clears existing handlers before adding new ones (prevents duplicate output on Uvicorn hot-reload).

**Handlers:**
- `StreamHandler(sys.stdout)` — terminal output
- `FileHandler("backend/logs/app.log", encoding="utf-8")` — persistent log file

**Format:** `2026-06-30 14:23:01 | INFO     | udsm | <message>`

**What gets logged:**

| Event | Level | Example |
|---|---|---|
| Server start/stop | INFO | `Starting UDSM Student Support API` |
| User registered | INFO | `New user registered: student@udsm.ac.tz` |
| User logged in | INFO | `User logged in: student@udsm.ac.tz` |
| Question received | INFO | `Question received | session=abc | user=student@... | q=How do I...` |
| Answer generated | INFO | `Answer generated | session=abc | tokens=312 | elapsed=17.42s | answer=...` |
| LLM error | ERROR | `LLM error | session=abc | Cannot connect to Ollama service.` |

---

## Running the Backend

```bash
# From the project root with venv active
uvicorn backend.main:app --reload --port 8000
```

- **`--reload`** — restarts on file change (development only)
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

---

## Dependencies

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-dotenv==1.0.0
httpx==0.25.0
motor==3.7.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1          # pinned — passlib 1.7.4 incompatible with bcrypt 5.x
requests==2.32.3       # used by tests/test_api.py
```

Install: `pip install -r requirements.txt`

---

## MongoDB via Docker

```bash
cd mongoDB
docker compose up -d      # start in background
docker compose down       # stop and remove container
docker compose down -v    # stop and delete data volume
```

Connection string: set in `backend/.env` as `MONGODB_URL` — must match the credentials in `mongoDB/.env`.  
Database: `udsm_db`  
Collections: `sessions`, `users`, `feedback`
