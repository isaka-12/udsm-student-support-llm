import { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ingestFile } from '../../services/api';
import { cn } from '../../utils/cn';

function FileChip({ file, onRemove, disabled }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
      <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <span className="text-xs text-zinc-700 dark:text-zinc-200 truncate max-w-[200px]">
        {file.name}
      </span>
      <span className="text-[10px] text-zinc-400 flex-shrink-0">
        {(file.size / 1024).toFixed(0)} KB
      </span>
      {!disabled && (
        <button
          onClick={() => onRemove(file)}
          className="ml-auto text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function UploadModal({ onClose }) {
  const [files, setFiles]     = useState([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]   = useState('idle'); // idle | uploading | success | error
  const [result, setResult]   = useState(null);   // { chunks, filename } or error string
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f =>
      /\.(pdf|txt)$/i.test(f.name)
    );
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))];
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const onInputChange = (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (file) => {
    setFiles(prev => prev.filter(f => f.name !== file.name));
  };

  const handleIngest = async () => {
    if (!files.length) return;
    setStatus('uploading');
    let totalChunks = 0;
    const errors = [];

    for (const file of files) {
      try {
        const res = await ingestFile(file);
        totalChunks += res.chunks;
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    if (errors.length === files.length) {
      setStatus('error');
      setResult(errors.join('\n'));
    } else {
      setStatus('success');
      setResult({ chunks: totalChunks, count: files.length - errors.length });
    }
  };

  const busy = status === 'uploading';

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
            <UploadCloud className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Add to Knowledge Base
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Success state */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  Added to knowledge base
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {result.chunks} chunks from {result.count} file{result.count !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Ingestion failed</p>
                <p className="text-xs text-zinc-500 mt-1 whitespace-pre-line">{result}</p>
              </div>
              <button
                onClick={() => { setStatus('idle'); setResult(null); }}
                className="mt-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                Try again
              </button>
            </div>
          )}

          {/* Idle / uploading state */}
          {(status === 'idle' || status === 'uploading') && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !busy && fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all',
                  busy ? 'opacity-50 cursor-not-allowed' : '',
                  dragging
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10'
                    : 'border-gray-200 dark:border-zinc-700 hover:border-amber-400/60 dark:hover:border-amber-500/40 hover:bg-gray-50 dark:hover:bg-zinc-800/40',
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  multiple
                  className="hidden"
                  onChange={onInputChange}
                />
                <UploadCloud className={cn('w-8 h-8 transition-colors', dragging ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-600')} />
                <div className="text-center">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Drop files here or <span className="text-amber-500 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">PDF and TXT — up to 10 MB each</p>
                </div>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map(f => (
                    <FileChip key={f.name} file={f} onRemove={removeFile} disabled={busy} />
                  ))}
                </div>
              )}

              {/* Action */}
              <button
                onClick={handleIngest}
                disabled={!files.length || busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
              >
                {busy ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                ) : (
                  <><UploadCloud className="w-4 h-4" />Add to Knowledge Base</>
                )}
              </button>

              <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center">
                Files will be searchable in all future conversations.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
