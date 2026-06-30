#!/usr/bin/env python3
"""
tests/test_api.py  —  API test script for UDSM Student Support LLM
Usage: python tests/test_api.py
Requires the backend to be running: uvicorn backend.main:app --port 8000
"""
import json
import sys
import uuid

import requests

BASE         = "http://localhost:8000"
TEST_EMAIL   = f"testuser_{uuid.uuid4().hex[:8]}@test.udsm.ac.tz"
TEST_PASS    = "TestPass1!"
TEST_SESSION = uuid.uuid4().hex
TOKEN        = None

GREEN = "\033[92m"
RED   = "\033[91m"
CYAN  = "\033[96m"
BOLD  = "\033[1m"
RESET = "\033[0m"

passed_total = []


def section(title: str) -> None:
    print(f"\n{CYAN}{BOLD}{'─' * 52}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{'─' * 52}{RESET}")


def check(label: str, ok: bool, detail: str = "") -> bool:
    icon = f"{GREEN}✓ PASS{RESET}" if ok else f"{RED}✗ FAIL{RESET}"
    suffix = f"  ({detail})" if detail else ""
    print(f"  {icon}  {label}{suffix}")
    passed_total.append(ok)
    return ok


# ── Health ─────────────────────────────────────────────────────────────────────

section("Task 3 — GET /health")
try:
    r = requests.get(f"{BASE}/health", timeout=5)
    check("HTTP 200", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("status == 'healthy'", body.get("status") == "healthy", body.get("status"))
    check("model field present", "model" in body, body.get("model", "missing"))
    check("active_sessions field present", "active_sessions" in body)
except requests.ConnectionError:
    check("Server reachable", False, f"Cannot connect to {BASE} — is the backend running?")
    print(f"\n{RED}Backend not running. Start with: uvicorn backend.main:app --port 8000{RESET}")
    sys.exit(1)


# ── Auth: register ─────────────────────────────────────────────────────────────

section("Auth — POST /auth/register")
try:
    r = requests.post(f"{BASE}/auth/register", json={
        "first_name": "Test",
        "last_name":  "User",
        "email":      TEST_EMAIL,
        "password":   TEST_PASS,
    }, timeout=5)
    check("HTTP 201", r.status_code == 201, f"got {r.status_code}")
    body = r.json()
    check("access_token returned", "access_token" in body)
    check("user.email matches", body.get("user", {}).get("email") == TEST_EMAIL)
    check("user.first_name present", bool(body.get("user", {}).get("first_name")))
    TOKEN = body.get("access_token")
except Exception as exc:
    check("Register request", False, str(exc))


# ── Auth: login ────────────────────────────────────────────────────────────────

section("Auth — POST /auth/login")
try:
    r = requests.post(f"{BASE}/auth/login", json={
        "email":    TEST_EMAIL,
        "password": TEST_PASS,
    }, timeout=5)
    check("HTTP 200", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("access_token returned", "access_token" in body)
    TOKEN = body.get("access_token") or TOKEN

    r_bad = requests.post(f"{BASE}/auth/login", json={
        "email": TEST_EMAIL, "password": "wrongpassword",
    }, timeout=5)
    check("Wrong password → 401", r_bad.status_code == 401, f"got {r_bad.status_code}")
except Exception as exc:
    check("Login request", False, str(exc))

HEADERS = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}


# ── Ask (SSE streaming) ────────────────────────────────────────────────────────

section("Task 3 — POST /ask  (SSE streaming)")
try:
    r = requests.post(f"{BASE}/ask", json={
        "question":   "What is UDSM and where is it located?",
        "session_id": TEST_SESSION,
    }, headers=HEADERS, stream=True, timeout=90)
    check("HTTP 200", r.status_code == 200, f"got {r.status_code}")
    check("Content-Type is SSE", "text/event-stream" in r.headers.get("content-type", ""))

    tokens: list[str] = []
    done_seen = False
    for raw_line in r.iter_lines():
        if not raw_line:
            continue
        line = raw_line if isinstance(raw_line, str) else raw_line.decode()
        if not line.startswith("data: "):
            continue
        try:
            event = json.loads(line[6:])
        except json.JSONDecodeError:
            continue
        if "token" in event:
            tokens.append(event["token"])
        if event.get("done"):
            done_seen = True
            break
        if "error" in event:
            check("No LLM error", False, event["error"])
            break

    check("Received tokens", len(tokens) > 0, f"{len(tokens)} tokens")
    check("Done event received", done_seen)
    answer = "".join(tokens)
    check("Answer length > 20 chars", len(answer) > 20, f"{len(answer)} chars")
    print(f"    Answer preview: {answer[:80].strip()}…")
except Exception as exc:
    check("Ask request", False, str(exc))


# ── Empty question error handling ──────────────────────────────────────────────

section("Task 7 — Error Handling: empty question")
try:
    r = requests.post(f"{BASE}/ask", json={
        "question": "", "session_id": TEST_SESSION,
    }, headers=HEADERS, timeout=5)
    check("Empty question → HTTP 400", r.status_code == 400, f"got {r.status_code}")
    check("Error detail present", "detail" in r.json())
except Exception as exc:
    check("Empty question test", False, str(exc))


# ── History ────────────────────────────────────────────────────────────────────

section("Task 3 — GET /history/{session_id}")
try:
    r = requests.get(f"{BASE}/history/{TEST_SESSION}", headers=HEADERS, timeout=5)
    check("HTTP 200", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("history key present", "history" in body)
    count = len(body.get("history", []))
    check("At least 2 messages (user + assistant)", count >= 2, f"got {count}")
except Exception as exc:
    check("History request", False, str(exc))


# ── Sessions ───────────────────────────────────────────────────────────────────

section("Sessions — GET /sessions  (requires auth)")
try:
    r = requests.get(f"{BASE}/sessions", headers=HEADERS, timeout=5)
    check("HTTP 200 with valid token", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("sessions list present", "sessions" in body)

    r_no_auth = requests.get(f"{BASE}/sessions", timeout=5)
    check("No token → 403", r_no_auth.status_code in (401, 403), f"got {r_no_auth.status_code}")
except Exception as exc:
    check("Sessions request", False, str(exc))


# ── Model info ─────────────────────────────────────────────────────────────────

section("Task 3 — GET /model-info")
try:
    r = requests.get(f"{BASE}/model-info", timeout=5)
    check("HTTP 200", r.status_code == 200, f"got {r.status_code}")
    body = r.json()
    check("model field present", "model" in body, body.get("model", "missing"))
    check("provider field present", "provider" in body, body.get("provider", "missing"))
    check("capabilities list present", isinstance(body.get("capabilities"), list))
except Exception as exc:
    check("Model info request", False, str(exc))


# ── Feedback ───────────────────────────────────────────────────────────────────

section("Bonus E — POST /feedback  (response evaluation)")
try:
    r = requests.post(f"{BASE}/feedback", json={
        "session_id":    TEST_SESSION,
        "message_index": 1,
        "rating":        5,
        "comment":       "Great answer!",
    }, headers=HEADERS, timeout=5)
    check("HTTP 200", r.status_code == 200, f"got {r.status_code}")
    check("success == True", r.json().get("success") is True)

    r_bad = requests.post(f"{BASE}/feedback", json={
        "session_id": TEST_SESSION, "message_index": 0, "rating": 9,
    }, headers=HEADERS, timeout=5)
    check("Rating 9 → HTTP 400", r_bad.status_code == 400, f"got {r_bad.status_code}")
except Exception as exc:
    check("Feedback request", False, str(exc))


# ── Cleanup ────────────────────────────────────────────────────────────────────

section("Cleanup — DELETE /history/{session_id}")
try:
    r = requests.delete(f"{BASE}/history/{TEST_SESSION}", headers=HEADERS, timeout=5)
    check("HTTP 200", r.status_code == 200, f"got {r.status_code}")
    r_gone = requests.get(f"{BASE}/history/{TEST_SESSION}", headers=HEADERS, timeout=5)
    body = r_gone.json()
    check("History now empty", len(body.get("history", [])) == 0,
          f"{len(body.get('history', []))} messages remaining")
except Exception as exc:
    check("Cleanup", False, str(exc))


# ── Summary ────────────────────────────────────────────────────────────────────

total  = len(passed_total)
passed = sum(passed_total)
failed = total - passed

print(f"\n{BOLD}{'═' * 52}{RESET}")
if failed == 0:
    print(f"{GREEN}{BOLD}  All {total} checks passed ✓{RESET}")
else:
    print(f"{RED}{BOLD}  {failed} of {total} checks FAILED{RESET}")
print(f"{BOLD}{'═' * 52}{RESET}\n")

sys.exit(0 if failed == 0 else 1)
