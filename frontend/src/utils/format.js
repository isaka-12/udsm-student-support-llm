export const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

/**
 * Buckets sessions into ChatGPT-style sidebar groups: Today, Yesterday,
 * Previous 7 Days, Previous 30 Days, then by month (this year) or year
 * (older). Expects `sessions` already sorted most-recent-first (as the
 * backend returns them) — bucket order falls out of that for free.
 */
export function groupSessionsByDate(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday    = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo  = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const order   = [];
  const buckets = new Map();

  for (const session of sessions) {
    let label = 'Older';
    if (session.last_used) {
      const utcStr = /[Zz]|[+-]\d{2}:\d{2}/.test(session.last_used)
        ? session.last_used : session.last_used + 'Z';
      const date = new Date(utcStr);
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (d >= today) label = 'Today';
      else if (d >= yesterday) label = 'Yesterday';
      else if (d >= sevenDaysAgo) label = 'Previous 7 Days';
      else if (d >= thirtyDaysAgo) label = 'Previous 30 Days';
      else if (d.getFullYear() === now.getFullYear()) label = date.toLocaleDateString('en-US', { month: 'long' });
      else label = String(d.getFullYear());
    }

    if (!buckets.has(label)) { buckets.set(label, []); order.push(label); }
    buckets.get(label).push(session);
  }

  return order.map(label => ({ label, sessions: buckets.get(label) }));
}
