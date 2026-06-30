import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Settings, LogOut, MoreHorizontal } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';

function Avatar({ initials, size = 'sm' }) {
  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 font-semibold text-white select-none',
      size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm',
    )}>
      {initials}
    </div>
  );
}

export default function ProfileMenu({ collapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const displayName = user ? `${user.first_name} ${user.last_name}`.trim() : '';
  const initials    = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div ref={ref} className="relative border-t border-gray-200 dark:border-zinc-800">
      {open && (
        <div className={cn(
          'absolute bottom-full mb-1 z-50',
          'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/60',
          'rounded-xl shadow-xl dark:shadow-2xl py-1.5 overflow-hidden',
          collapsed ? 'left-full ml-2 w-48' : 'left-2 right-2',
        )}>
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-zinc-700/50 mb-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>

          {[
            { Icon: UserCircle, label: 'Profile' },
            { Icon: Settings,   label: 'Preferences' },
          ].map(({ Icon, label }) => (
            <button key={label} onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors text-left">
              <Icon className="w-4 h-4 opacity-60" />
              {label}
            </button>
          ))}

          <div className="my-1 border-t border-gray-100 dark:border-zinc-700/50" />

          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left">
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      )}

      {collapsed ? (
        <button onClick={() => setOpen(v => !v)} title={displayName}
          className="w-full flex justify-center py-3 px-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <Avatar initials={initials} />
        </button>
      ) : (
        <button onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
          <Avatar initials={initials} />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{displayName}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 truncate">{user?.email}</p>
          </div>
          <MoreHorizontal className="w-4 h-4 text-zinc-400 dark:text-zinc-600 flex-shrink-0" />
        </button>
      )}
    </div>
  );
}
