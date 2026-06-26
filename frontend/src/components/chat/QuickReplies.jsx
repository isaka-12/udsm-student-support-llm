import React from 'react';
import { QUICK_TOPICS } from '../../data/constants';

export default function QuickReplies({ onPick }) {
  return (
    <div className="flex-shrink-0 border-t border-gray-200 dark:border-zinc-800/60 px-4 sm:px-6 py-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-0.5 sm:flex-wrap scrollbar-none">
          {QUICK_TOPICS.map(({ label, question }) => (
            <button key={label} onClick={() => onPick(question)}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700/50 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs font-medium flex-shrink-0 whitespace-nowrap transition-colors">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
