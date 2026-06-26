import React from 'react';
import { Bot, Menu, Sun, Moon, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';

export default function Header({ onMenuOpen }) {
  const { dark, toggle } = useTheme();
  const { modelInfo, clearMessages } = useChat();

  return (
    <header className="flex items-center gap-3 px-4 h-14 border-b border-gray-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-sm flex-shrink-0">
      {/* Mobile hamburger */}
      <button onClick={onMenuOpen}
        className="md:hidden p-2 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0 transition-colors">
        <Menu className="w-5 h-5" />
      </button>

      {/* Identity */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-amber-500 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">UDSM Student Support</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span className="text-xs text-zinc-500">
              Online
              {modelInfo && (
                <span className="hidden sm:inline text-zinc-400 dark:text-zinc-600"> · {modelInfo.model}</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Theme toggle */}
      <button onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}
        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 flex-shrink-0 transition-colors">
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Clear chat */}
      <button onClick={clearMessages} title="Clear chat"
        className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 flex-shrink-0 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </header>
  );
}
