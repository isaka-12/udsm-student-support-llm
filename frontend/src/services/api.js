const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const TOKEN_KEY = 'udsm_token';
export const USER_KEY  = 'udsm_user';

const getToken = () => localStorage.getItem(TOKEN_KEY);

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.replace('/login');
    return null;
  }
  return res;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Login failed');
  }
  return res.json();
}

export async function registerUser({ firstName, lastName, email, password }) {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      first_name: firstName,
      last_name:  lastName,
      email,
      password,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Registration failed');
  }
  return res.json();
}

// ── Chat ────────────────────────────────────────────────────────────────────

export async function fetchModelInfo() {
  const res = await apiFetch('/model-info');
  if (!res || !res.ok) throw new Error('Failed to fetch model info');
  return res.json();
}

export async function clearHistory(sessionId = 'default') {
  await apiFetch(`/history/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
}

export async function fetchSessions() {
  const res = await apiFetch('/sessions');
  if (!res || !res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function fetchHistory(sessionId) {
  const res = await apiFetch(`/history/${encodeURIComponent(sessionId)}`);
  if (!res || !res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function submitFeedback(sessionId, messageIndex, rating, comment = '') {
  const res = await apiFetch('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      session_id:    sessionId,
      message_index: messageIndex,
      rating,
      comment,
    }),
  });
  if (!res || !res.ok) throw new Error('Feedback submission failed');
  return res.json();
}

export async function fetchModels() {
  const res = await apiFetch('/models');
  if (!res || !res.ok) return { models: [], current: '' };
  return res.json();
}

export async function ingestFile(file) {
  const token = getToken();
  const form  = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/ingest-file`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Ingestion failed');
  }
  return res.json();
}

export async function extractFile(file) {
  const token = getToken();
  const form  = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/extract-file`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'File extraction failed');
  }
  return res.json();
}

export async function* streamQuestion(question, sessionId = 'default', { model, fileContext } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      question,
      session_id:   sessionId,
      ...(model       && { model }),
      ...(fileContext && { file_context: fileContext }),
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try { yield JSON.parse(line.slice(6)); } catch { /* skip malformed */ }
    }
  }
}
