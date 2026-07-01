import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { groupSessionsByDate } from '../../utils/format';

/**
 * Shared, date-grouped session list used by both the desktop and mobile
 * sidebars (previously duplicated verbatim in each).
 */
export default function SessionList({
  sessions, currentSessionId, switchSession, deleteSession,
  collapsed = false, onSwitch,
}) {
  const [hoveredId, setHoveredId] = useState(null);

  const handleSwitch = (id) => {
    switchSession(id);
    onSwitch?.();
  };

  return (
    <>
      {groupSessionsByDate(sessions).map(group => (
        <div key={group.label}>
          {!collapsed && (
            <p className="sticky top-0 z-10 -mx-0.5 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.sessions.map(session => {
              const active  = session.session_id === currentSessionId;
              const hovered = hoveredId === session.session_id;
              return (
                <div
                  key={session.session_id}
                  className="relative"
                  onMouseEnter={() => setHoveredId(session.session_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onTouchStart={() => setHoveredId(session.session_id)}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-amber-500" />
                  )}
                  <button
                    onClick={() => handleSwitch(session.session_id)}
                    title={collapsed ? session.title : undefined}
                    className={cn(
                      'w-full flex items-center rounded-xl text-left transition-colors',
                      collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                      active
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'text-zinc-500 hover:bg-gray-100/70 hover:text-zinc-700 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300',
                    )}
                  >
                    {!collapsed && (
                      <div className={cn('flex-1 min-w-0', hovered ? 'pr-6' : '')}>
                        <p className="text-sm font-medium truncate">{session.title}</p>
                      </div>
                    )}
                  </button>

                  {/* Per-item delete — shown on hover, not in collapsed mode */}
                  {!collapsed && hovered && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.session_id); }}
                      title="Delete"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
