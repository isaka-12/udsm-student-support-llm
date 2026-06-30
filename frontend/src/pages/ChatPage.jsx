import { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import DesktopSidebar from '../components/sidebar/DesktopSidebar';
import MobileSidebar  from '../components/sidebar/MobileSidebar';
import Header         from '../components/layout/Header';
import MessageList    from '../components/chat/MessageList';
import Welcome        from '../components/chat/Welcome';
import ChatInput      from '../components/chat/ChatInput';

export default function ChatPage() {
  const { messages, fetchModelInfo, sendMessage } = useChat();
  const [input, setInput]         = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobOpen, setMobOpen]     = useState(false);

  useEffect(() => { fetchModelInfo(); }, [fetchModelInfo]);

  useEffect(() => {
    const h = () => { if (window.innerWidth >= 768) setMobOpen(false); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const isWelcome = messages.length === 1 && messages[0].role === 'assistant';

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <DesktopSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
      />
      <MobileSidebar open={mobOpen} onClose={() => setMobOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Header onMenuOpen={() => setMobOpen(true)} />

        <div className="flex-1 overflow-y-auto flex flex-col">
          {isWelcome
            ? <Welcome onPick={(q) => { setInput(q); }} />
            : <MessageList onEdit={setInput} onRetry={sendMessage} />}
        </div>

        <ChatInput input={input} setInput={setInput} />
      </div>
    </div>
  );
}
