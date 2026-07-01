import { useRef, useState, useEffect, useCallback } from 'react';
import { Send, Paperclip, ChevronDown, Check } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { fetchModels } from '../../services/api';
import { cn } from '../../utils/cn';
import UploadModal from './UploadModal';

const SELECTED_MODEL_KEY = 'udsm_selected_model';

export default function ChatInput({ input, setInput }) {
  const { isLoading, sendMessage } = useChat();
  const textareaRef  = useRef(null);
  const modelMenuRef = useRef(null);

  const [models, setModels]               = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [uploadOpen, setUploadOpen]       = useState(false);

  const chooseModel = useCallback((model) => {
    setSelectedModel(model);
    setModelMenuOpen(false);
    localStorage.setItem(SELECTED_MODEL_KEY, model);
  }, []);

  useEffect(() => {
    fetchModels()
      .then(data => {
        const available = data.models || [];
        setModels(available);
        // Restore the last-picked model if it's still available locally,
        // otherwise fall back to the backend's configured default.
        const saved = localStorage.getItem(SELECTED_MODEL_KEY);
        setSelectedModel(saved && available.includes(saved) ? saved : (data.current || null));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!modelMenuOpen) return;
    const close = (e) => {
      if (!modelMenuRef.current?.contains(e.target)) setModelMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [modelMenuOpen]);

  const send = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const q = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(q, { model: selectedModel || undefined });
  }, [input, isLoading, selectedModel, setInput, sendMessage]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onType = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const displayModel = selectedModel
    ? selectedModel.replace(/:latest$/, '')
    : 'default';

  return (
    <>
      <div className="flex-shrink-0   px-4 sm:px-6  pb-4 bg-transparent">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700/60 focus-within:border-amber-400/60 dark:focus-within:border-amber-500/40 rounded-2xl transition-colors shadow-sm">

            {/* Text area */}
            <div className="px-4 pt-3 pb-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={onType}
                onKeyDown={onKey}
                placeholder="Ask about admissions, fees, exams…"
                disabled={isLoading}
                rows={1}
                className="w-full bg-transparent text-sm text-zinc-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 resize-none outline-none leading-relaxed disabled:opacity-40"
                style={{ minHeight: '22px', maxHeight: '140px' }}
              />
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center gap-2 px-3 pb-3 pt-1">

              {/* Model selector pill — left */}
              {models.length > 0 && (
                <div ref={modelMenuRef} className="relative">
                  <button
                    onClick={() => setModelMenuOpen(v => !v)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:border-amber-400/60 dark:hover:border-amber-500/40 transition-colors"
                  >
                    <span className="max-w-[120px] truncate">{displayModel}</span>
                    <ChevronDown className={cn('w-3 h-3 flex-shrink-0 transition-transform', modelMenuOpen && 'rotate-180')} />
                  </button>

                  {modelMenuOpen && (
                    <div className="absolute bottom-full mb-2 left-0 min-w-[160px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl dark:shadow-2xl py-1.5 z-50 overflow-hidden">
                      {models.map(m => {
                        const isActive = m === selectedModel;
                        return (
                          <button
                            key={m}
                            onClick={() => chooseModel(m)}
                            className={cn(
                              'w-full flex items-center justify-between gap-3 px-3 py-2 text-xs text-left transition-colors',
                              isActive
                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                : 'text-zinc-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800',
                            )}
                          >
                            <span className="truncate">{m.replace(/:latest$/, '')}</span>
                            {isActive && <Check className="w-3 h-3 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Hint */}
              <span className="hidden sm:inline text-[11px] text-zinc-400 dark:text-zinc-600 select-none">
                Shift+Enter for new line
              </span>

              {/* Attach pill — right, before send */}
              <button
                onClick={() => setUploadOpen(true)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:border-amber-400/60 dark:hover:border-amber-500/40 hover:text-amber-500 dark:hover:text-amber-400 disabled:opacity-30 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach</span>
              </button>

              {/* Send */}
              <button
                onClick={send}
                disabled={isLoading || !input.trim()}
                className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed text-white flex items-center justify-center flex-shrink-0 transition-all"
              >
                {isLoading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </>
  );
}
