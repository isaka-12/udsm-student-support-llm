import { useEffect, useState } from 'react';

import { fetchQuickQuestions } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import udsmLogo from '../../assets/udsm.png';

// Shown only if the API returns nothing (e.g. Ollama unreachable or the
// knowledge base is empty) — a small last-resort fallback, not the source
// of truth for suggestions.
const FALLBACK_QUESTIONS = [
  'What are the undergraduate admission requirements at UDSM?',
  'How do I register for courses at UDSM?',
  'What are the examination regulations at UDSM?',
];

function pickThree(arr) {
  const copy = [...arr];
  const result = [];
  while (result.length < 3 && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(i, 1)[0]);
  }
  return result;
}

export default function Welcome({ onPick }) {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchQuickQuestions()
      .then(({ questions }) => {
        if (cancelled) return;
        setCards(pickThree(questions?.length ? questions : FALLBACK_QUESTIONS));
      })
      .catch(() => { if (!cancelled) setCards(pickThree(FALLBACK_QUESTIONS)); });
    return () => { cancelled = true; };
  }, []);

  const firstName = user?.first_name || '';
  const greeting  = firstName ? `Hi, ${firstName}` : 'How can I help you?';

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 select-none">

      {/* Logo + greeting */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
          <img src={udsmLogo} alt="UDSM" className="w-9 h-9 object-contain" />
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          {greeting}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Ask anything about UDSM — admissions, fees, regulations, and more.
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((question) => (
          <button
            key={question}
            onClick={() => onPick(question)}
            className="group flex flex-col gap-3 text-left p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-amber-400/60 dark:hover:border-amber-500/40 hover:shadow-md dark:hover:shadow-zinc-900 transition-all duration-200"
          >
            <div className="flex-1">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2">
                {question}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
