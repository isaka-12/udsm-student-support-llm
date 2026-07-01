import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, FileType, FileText, File } from 'lucide-react';
import { fetchKnowledgeBase } from '../../services/api';
import { cn } from '../../utils/cn';

const FILE_TYPE_STYLE = {
  pdf: { Icon: FileType, badge: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  txt: { Icon: FileText, badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' },
};

function fileTypeStyle(source) {
  const ext = source.split('.').pop()?.toLowerCase();
  return FILE_TYPE_STYLE[ext] ?? { Icon: File, badge: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' };
}

export default function KnowledgeBaseTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchKnowledgeBase());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {data ? `${data.sources.length} document${data.sources.length !== 1 ? 's' : ''} · ${data.total_chunks} chunks indexed` : ' '}
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-10 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 py-4 text-center">{error}</p>
      )}

      {data && data.sources.length === 0 && (
        <p className="text-sm text-zinc-400 text-center py-10">No documents ingested yet.</p>
      )}

      {data && data.sources.length > 0 && (
        <div className="space-y-1.5">
          {data.sources.map(s => {
            const { Icon, badge } = fileTypeStyle(s.source);
            return (
              <div
                key={s.source}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', badge)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="flex-1 min-w-0 text-sm text-zinc-700 dark:text-zinc-200 truncate">{s.source}</span>
                <span className="flex-shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-full px-2 py-0.5">
                  {s.chunks} chunks
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
