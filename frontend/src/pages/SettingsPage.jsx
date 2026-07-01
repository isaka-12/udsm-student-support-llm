import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, ScrollText } from 'lucide-react';
import DesktopSidebar    from '../components/sidebar/DesktopSidebar';
import MobileSidebar     from '../components/sidebar/MobileSidebar';
import KnowledgeBaseTab  from '../components/settings/KnowledgeBaseTab';
import LogsTable         from '../components/settings/LogsTable';
import { cn } from '../utils/cn';

const TABS = [
  { key: 'kb',   label: 'Knowledge Base', Icon: Database },
  { key: 'logs', label: 'Logs',           Icon: ScrollText },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobOpen, setMobOpen]     = useState(false);
  const [tab, setTab]             = useState('kb');

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <DesktopSidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <MobileSidebar open={mobOpen} onClose={() => setMobOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center gap-2 px-4 h-14 border-b border-gray-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => navigate('/chat')}
            title="Back to chat"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">Settings</p>
        </header>

        <div className="flex items-center gap-1 px-4 pt-2 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === key
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'kb' ? <KnowledgeBaseTab /> : <LogsTable />}
        </div>
      </div>
    </div>
  );
}
