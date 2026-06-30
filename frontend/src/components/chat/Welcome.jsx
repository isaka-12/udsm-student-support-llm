import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { QUICK_TOPICS } from '../../data/constants';
import { useAuth } from '../../contexts/AuthContext';
import udsmLogo from '../../assets/udsm.png';

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
  const cards = useMemo(() => pickThree(QUICK_TOPICS), []);

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
          Ask anything about UDSM — admissions, fees, exams, and more.
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ icon: Icon, label, question }) => (
          <button
            key={label}
            onClick={() => onPick(question)}
            className="group flex flex-col gap-3 text-left p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-amber-400/60 dark:hover:border-amber-500/40 hover:shadow-md dark:hover:shadow-zinc-900 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wide">
                {label}
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2">
                {question}
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all self-end" />
          </button>
        ))}
      </div>
    </div>
  );
}
