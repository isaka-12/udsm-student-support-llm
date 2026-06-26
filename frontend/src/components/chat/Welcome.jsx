import React from 'react';
import { QUICK_TOPICS } from '../../data/constants';
import udsmLogo from '../../assets/udsm.png';

export default function Welcome({ onPick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <img src={udsmLogo} alt="UDSM" className="w-20 h-20 object-contain mb-5 drop-shadow-sm" />
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        UDSM Student Support
      </h2>
      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-8">
        Ask me anything about the University of Dar es Salaam — admissions, courses, fees, exams, and more.
      </p>

      <div className="w-full max-w-sm text-left">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mb-3 text-center">
          Common questions
        </p>
        <ul className="space-y-1">
          {QUICK_TOPICS.map(({ question }) => (
            <li key={question}>
              <button
                onClick={() => onPick(question)}
                className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 py-1.5 flex items-start gap-2 transition-colors group"
              >
                <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500/50 group-hover:bg-amber-500 flex-shrink-0 transition-colors" />
                {question}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
