import React, { useState } from 'react';
import { Bot, User, Copy, Check, Zap, Pencil, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { fmtTime } from '../../utils/format';
import MarkdownRenderer from './MarkdownRenderer';

function Avatar({ isUser }) {
  if (isUser) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 dark:bg-zinc-700 dark:border-zinc-600 flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-gray-500 dark:text-zinc-300" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Bot className="w-4 h-4 text-amber-500 dark:text-amber-400" />
    </div>
  );
}

export default function Bubble({ message, onEdit, onRetry }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── User bubble ── */
  if (isUser) {
    return (
      <div className="flex items-start gap-3 mb-5 justify-end group">
        <div className="flex flex-col items-end gap-1.5" style={{ maxWidth: '80%' }}>
          <div className="bg-slate-100 border border-slate-200 dark:bg-[#1e3a5f] dark:border-[#2d5080] rounded-2xl rounded-tr-none px-4 py-3">
            <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          <div className="flex items-center gap-3 pr-0.5">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-600">{fmtTime(message.timestamp)}</span>
            {onEdit && (
              <button
                onClick={() => onEdit(message.content)}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>
        </div>
        <Avatar isUser />
      </div>
    );
  }

  /* ── Bot: waiting for first token ── */
  if (message.streaming && !message.content) {
    return (
      <div className="flex items-start gap-3 mb-5">
        <Avatar />
        <div className="bg-white border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700/60 rounded-2xl rounded-tl-none px-4 py-3">
          <div className="flex gap-1.5 items-center h-5">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full bg-gray-400 dark:bg-zinc-500 animate-bounce-dot"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Bot: content (streaming or final) ── */
  return (
    <div className="flex items-start gap-3 mb-5 group">
      <Avatar />
      <div className="flex flex-col items-start gap-1.5" style={{ maxWidth: '80%' }}>
        <div className={cn(
          'rounded-2xl rounded-tl-none px-4 py-3 text-sm',
          message.isError
            ? 'bg-red-50 border border-red-200 dark:bg-red-950/60 dark:border-red-800/50 text-red-600 dark:text-red-300'
            : 'bg-white border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-100',
        )}>
          {message.isError
            ? <p className="leading-relaxed">{message.content}</p>
            : <MarkdownRenderer content={message.content} />}
          {message.streaming && (
            <span className="inline-block w-0.5 h-4 bg-current opacity-70 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
        {!message.streaming && (
          <div className="flex items-center gap-3 pl-0.5">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-600">{fmtTime(message.timestamp)}</span>
            {message.responseTime && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-600 flex items-center gap-1">
                <Zap className="w-3 h-3" />{message.responseTime.toFixed(1)}s
              </span>
            )}
            {/* Retry — only on error messages */}
            {message.isError && onRetry && (
              <button
                onClick={onRetry}
                className="text-[11px] text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            )}
            {/* Copy — on all non-error bot messages */}
            {!message.isError && (
              <button onClick={copy}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {copied
                  ? <><Check className="w-3 h-3 text-emerald-500" /><span className="text-emerald-500">Copied</span></>
                  : <><Copy className="w-3 h-3" />Copy</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
