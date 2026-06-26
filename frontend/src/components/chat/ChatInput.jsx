import React, { useRef } from 'react';
import { Send } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';

export default function ChatInput({ input, setInput }) {
  const { isLoading, sendMessage } = useChat();
  const textareaRef = useRef(null);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const q = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(q);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onType = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  return (
    <div className="flex-shrink-0 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-end gap-3 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700/60 focus-within:border-gray-400 dark:focus-within:border-zinc-500 rounded-2xl px-4 py-3 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={onType}
            onKeyDown={onKey}
            placeholder="Ask about UDSM services…"
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 resize-none outline-none leading-relaxed disabled:opacity-40"
            style={{ minHeight: '22px', maxHeight: '140px' }}
          />
          <button onClick={send} disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed text-white flex items-center justify-center flex-shrink-0 transition-all">
            {isLoading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-700 text-center mt-2 select-none">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
