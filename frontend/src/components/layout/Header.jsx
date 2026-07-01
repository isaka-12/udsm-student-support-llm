import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';

export default function Header({ onMenuOpen }) {
  const { dark, toggle } = useTheme();
  const { sessions, currentSessionId } = useChat();

  const currentSession = sessions.find(s => s.session_id === currentSessionId);
  const title = currentSession?.title ?? 'New Chat';

  return (
    <header className="flex items-center gap-2 px-4 h-14 border-b border-gray-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-sm flex-shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuOpen}
        className="md:hidden p-2 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Session title — grows to fill space */}
      <div className="flex-1 min-w-0 px-1">
        <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate">
          {title}
        </p>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        title={dark ? 'Light mode' : 'Dark mode'}
        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 flex-shrink-0 transition-colors"
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      
      
    </header>
  );
}
