import { useState } from 'react';

export function useLocalStorage(key, defaultValue) {
  const [value, setValueState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = (next) => {
    const resolved = typeof next === 'function' ? next(value) : next;
    setValueState(resolved);
    try { localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* quota full */ }
  };

  return [value, setValue];
}
