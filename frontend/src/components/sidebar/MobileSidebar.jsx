import { Plus, X } from 'lucide-react';
import udsmLogo from '../../assets/udsm.png';
import { cn } from '../../utils/cn';
import { useChat } from '../../contexts/ChatContext';
import ProfileMenu from './ProfileMenu';
import SessionList from './SessionList';

export default function MobileSidebar({ open, onClose }) {
  const { sessions, currentSessionId, createNewSession, switchSession, deleteSession } = useChat();

  const handleNewChat = () => { createNewSession(); onClose(); };

  return (
    <div className={cn('fixed inset-0 z-50 md:hidden', !open && 'pointer-events-none')}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      {/* Drawer */}
      <div className={cn(
        'absolute inset-y-0 left-0 w-72 shadow-xl dark:shadow-2xl transition-transform duration-300 flex flex-col bg-white dark:bg-zinc-900',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <img src={udsmLogo} alt="UDSM" className="w-9 h-9 rounded-xl object-contain flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">UDSM Assistant</p>
              <p className="text-xs text-zinc-500">Student Support</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat */}
        <div className="p-3 border-b border-gray-200 dark:border-zinc-800">
          <button onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-200 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Session history */}
        <nav className="flex-1 overflow-y-auto p-2">
          <SessionList
            sessions={sessions}
            currentSessionId={currentSessionId}
            switchSession={switchSession}
            deleteSession={deleteSession}
            onSwitch={onClose}
          />
        </nav>

        <ProfileMenu collapsed={false} />
      </div>
    </div>
  );
}
