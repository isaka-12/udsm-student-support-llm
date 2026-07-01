import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Loader2, AlertCircle, AlertTriangle, CheckCircle2, Info, Search, X } from 'lucide-react';
import { fetchLogs } from '../../services/api';
import { cn } from '../../utils/cn';

// Level colors are reserved for the pill only — red/orange/green map to
// error/warning/success so the eye can scan a column of pills at a glance,
// without tinting whole rows (which made the table noisy to read).
const LEVEL_STYLE = {
  CRITICAL: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       Icon: AlertCircle },
  ERROR:    { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       Icon: AlertCircle },
  WARNING:  { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', Icon: AlertTriangle },
  INFO:     { badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', Icon: CheckCircle2 },
  DEBUG:    { badge: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',       Icon: Info },
};

const LEVEL_ORDER = ['ERROR', 'CRITICAL', 'WARNING', 'INFO', 'DEBUG'];

function levelStyle(level) {
  return LEVEL_STYLE[level?.toUpperCase()] ?? LEVEL_STYLE.DEBUG;
}

export default function LogsTable() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [activeLevels, setActiveLevels] = useState(null); // null = all
  const [search, setSearch]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchLogs());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const levelCounts = useMemo(() => {
    const counts = {};
    for (const e of data?.entries ?? []) {
      const lvl = e.level?.toUpperCase() ?? 'DEBUG';
      counts[lvl] = (counts[lvl] ?? 0) + 1;
    }
    return counts;
  }, [data]);

  const levelsPresent = useMemo(
    () => LEVEL_ORDER.filter(l => levelCounts[l] > 0),
    [levelCounts],
  );

  const toggleLevel = (level) => {
    setActiveLevels(prev => {
      const base = prev ?? new Set(levelsPresent); // "all" -> start from everything shown
      const next = new Set(base);
      if (next.has(level)) next.delete(level); else next.add(level);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.entries.filter(e => {
      const lvl = e.level?.toUpperCase() ?? 'DEBUG';
      if (activeLevels && !activeLevels.has(lvl)) return false;
      if (!q) return true;
      return e.message.toLowerCase().includes(q) || e.logger.toLowerCase().includes(q);
    });
  }, [data, activeLevels, search]);

  return (
    <div className="space-y-3">
      {/* Toolbar: level filter chips + search + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveLevels(null)}
          className={cn(
            'px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border transition-colors',
            activeLevels === null
              ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
              : 'text-zinc-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800',
          )}
        >
          All
        </button>
        {levelsPresent.map(level => {
          const active = activeLevels === null || activeLevels.has(level);
          const { badge, Icon } = levelStyle(level);
          return (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border transition-opacity',
                badge,
                active ? 'opacity-100 border-transparent' : 'opacity-35 border-transparent',
              )}
            >
              <Icon className="w-3 h-3" />
              {level}
              <span className="opacity-70">{levelCounts[level]}</span>
            </button>
          );
        })}

        <div className="flex-1" />

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search message or logger…"
            className="pl-8 pr-7 py-1.5 w-56 text-xs rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-amber-400/60 dark:focus:border-amber-500/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-600">
        {data ? `Showing ${filtered.length} of ${data.entries.length} entries` : ' '}
      </p>

      {loading && !data && (
        <div className="flex items-center justify-center py-10 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 py-4 text-center">{error}</p>
      )}

      {data && filtered.length === 0 && (
        <p className="text-sm text-zinc-400 text-center py-10">
          {data.entries.length === 0 ? 'No log entries found.' : 'No entries match the current filters.'}
        </p>
      )}

      {data && filtered.length > 0 && (
        <div className="border border-gray-200 dark:border-zinc-700/60 rounded-xl overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 bg-gray-50 dark:bg-zinc-800/95 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-700/60">
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 w-24">Level</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 w-40">Time</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 w-32">Logger</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const { badge, Icon } = levelStyle(entry.level);
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-100 dark:border-zinc-800 last:border-0 align-top even:bg-gray-50/60 dark:even:bg-zinc-800/30 hover:bg-amber-50/40 dark:hover:bg-amber-500/5 transition-colors"
                    >
                      <td className="px-3 py-2">
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5', badge)}>
                          <Icon className="w-3 h-3" />
                          {entry.level}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{entry.timestamp}</td>
                      <td className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-600 truncate max-w-[8rem]" title={entry.logger}>{entry.logger}</td>
                      <td className="px-3 py-2 text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
                        {entry.message}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
