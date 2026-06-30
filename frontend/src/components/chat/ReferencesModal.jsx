import { useEffect } from 'react';
import { X, BookOpen, FileText } from 'lucide-react';

const SOURCE_LABELS = {
  'ALMANAC_2025-2026.txt':                           'University Almanac 2025/2026',
  'UDSM AI Guidelines.txt':                          'UDSM AI Guidelines',
  'UDSM_BACHELOR_JOINING_INSTRUCTION_2025_2026.txt': 'Bachelor Joining Instructions 2025/2026',
  'UNDERGRADUATE_PROSPECTUS_2025-2026.txt':          'Undergraduate Prospectus 2025/2026',
};

function displayName(filename) {
  return SOURCE_LABELS[filename]
    ?? filename.replace(/\.txt$/i, '').replace(/_/g, ' ');
}

function groupRefs(refs) {
  const map = new Map();
  for (const { source, page } of refs) {
    if (!map.has(source)) map.set(source, []);
    if (page && !map.get(source).includes(page)) map.get(source).push(page);
  }
  return Array.from(map.entries()).map(([source, pages]) => ({
    source,
    label: displayName(source),
    pages: pages.sort((a, b) => a - b),
  }));
}

export default function ReferencesModal({ refs, onClose }) {
  const groups = groupRefs(refs);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Sources
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1">
              {groups.length} document{groups.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sources list */}
        <ul className="px-5 py-4 space-y-3">
          {groups.map(({ source, label, pages }) => (
            <li key={source} className="flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 leading-snug">
                  {label}
                </p>
                {pages.length > 0 && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {pages.length === 1
                      ? `Page ${pages[0]}`
                      : `Pages ${pages.join(', ')}`}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="px-5 pb-4">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
            This answer was generated from official UDSM documents.
          </p>
        </div>
      </div>
    </div>
  );
}
