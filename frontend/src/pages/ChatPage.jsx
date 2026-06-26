import React, { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import DesktopSidebar from '../components/sidebar/DesktopSidebar';
import MobileSidebar from '../components/sidebar/MobileSidebar';
import Header from '../components/layout/Header';
import MessageList from '../components/chat/MessageList';
import Welcome from '../components/chat/Welcome';
import QuickReplies from '../components/chat/QuickReplies';
import ChatInput from '../components/chat/ChatInput';

export default function ChatPage({ onLogout }) {
  const { messages, modelInfo, fetchModelInfo, sendMessage } = useChat();
  const [input, setInput]         = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobOpen, setMobOpen]     = useState(false);

  useEffect(() => { fetchModelInfo(); }, []);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const h = () => { if (window.innerWidth >= 768) setMobOpen(false); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const isWelcome   = messages.length === 1;
  const showReplies = messages.length > 1 && messages.length <= 3;

  const pick     = (text) => setInput(text);
  const handleEdit  = (text) => setInput(text);
  const handleRetry = (text) => sendMessage(text);

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <DesktopSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        modelInfo={modelInfo}
        onLogout={onLogout}
      />

      <MobileSidebar
        open={mobOpen}
        onClose={() => setMobOpen(false)}
        onLogout={onLogout}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Header onMenuOpen={() => setMobOpen(true)} />

        <div className="flex-1 overflow-y-auto flex flex-col">
          {isWelcome ? <Welcome onPick={pick} /> : <MessageList onEdit={handleEdit} onRetry={handleRetry} />}
        </div>

        {showReplies && <QuickReplies onPick={pick} />}

        <ChatInput input={input} setInput={setInput} />
      </div>
    </div>
  );
}
