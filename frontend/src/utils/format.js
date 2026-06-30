export const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export function relativeDate(dateStr) {
  // Naive datetime strings from the backend have no timezone — treat as UTC
  const utcStr = /[Zz]|[+-]\d{2}:\d{2}/.test(dateStr) ? dateStr : dateStr + 'Z';
  const date = new Date(utcStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d >= today) return 'Today';
  if (d >= yesterday) return 'Yesterday';
  const diffDays = Math.floor((today - d) / 86_400_000);
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
