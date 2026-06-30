import { ChevronLeft, ChevronRight, Plus, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';
import { relativeDate } from '../../utils/format';
import { useChat } from '../../contexts/ChatContext';
import ProfileMenu from './ProfileMenu';
import udsmLogo from '../../assets/udsm.png';

export default function DesktopSidebar({ collapsed, onToggle }) {
  const { sessions, currentSessionId, createNewSession, switchSession } = useChat();

  return (
    <aside className={cn(
      'hidden md:block flex-shrink-0 border-r border-gray-200 dark:border-zinc-800 overflow-hidden transition-[width] duration-300',
      collapsed ? 'w-14' : 'w-60',
    )}>
      <div className={cn('h-full flex flex-col bg-white dark:bg-zinc-900', collapsed ? 'w-14' : 'w-60')}>

        {/* Brand + toggle */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 px-2 py-4 border-b border-gray-200 dark:border-zinc-800">
            <img src={udsmLogo} alt="UDSM" className="w-9 h-9 rounded-xl object-contain" />
            <button onClick={onToggle} title="Expand sidebar"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 min-w-0">
              <img src={udsmLogo} alt="UDSM" className="w-9 h-9 rounded-xl object-contain flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">UDSM Assistant</p>
                <p className="text-xs text-zinc-500">Student Support</p>
              </div>
            </div>
            <button onClick={onToggle} title="Collapse sidebar"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* New Chat */}
        <div className={cn('border-b border-gray-200 dark:border-zinc-800', collapsed ? 'px-2 py-3' : 'p-3')}>
          {collapsed ? (
            <button onClick={createNewSession} title="New Chat"
              className="w-full flex items-center justify-center p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-200 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          )}
        </div>

        {/* Session history */}
        <nav className={cn('flex-1 overflow-y-auto space-y-0.5', collapsed ? 'p-2' : 'p-3')}>
          {!collapsed && sessions.length > 0 && (
            <p className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-semibold">
              Recent
            </p>
          )}
          {sessions.map(session => {
            const active = session.session_id === currentSessionId;
            return (
              <button key={session.session_id}
                onClick={() => switchSession(session.session_id)}
                title={collapsed ? session.title : undefined}
                className={cn(
                  'w-full flex items-center rounded-xl text-left transition-colors',
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-gray-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-500 hover:bg-gray-100/70 hover:text-zinc-700 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300',
                )}>
                <MessageSquare className={cn('flex-shrink-0 opacity-60', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{session.title}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                      {session.last_used ? relativeDate(session.last_used) : ''}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <ProfileMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
