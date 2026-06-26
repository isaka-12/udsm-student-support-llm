const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchModelInfo() {
  const res = await fetch(`${BASE}/model-info`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function clearHistory() {
  await fetch(`${BASE}/history`, { method: 'DELETE' });
}

export async function* streamQuestion(question) {
  const res = await fetch(`${BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
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
