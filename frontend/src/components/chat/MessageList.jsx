import React from 'react';
import Bubble from './Bubble';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import { useChat } from '../../contexts/ChatContext';

export default function MessageList({ onEdit, onRetry }) {
  const { messages } = useChat();
  const endRef = useAutoScroll([messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-2xl mx-auto">
        {messages.map((m, i) => (
          <Bubble
            key={m.id}
            message={m}
            onEdit={m.role === 'user' ? onEdit : undefined}
            onRetry={m.isError ? () => {
              // find the nearest user message before this error
              const prev = messages.slice(0, i).reverse().find(msg => msg.role === 'user');
              if (prev) onRetry(prev.content);
            } : undefined}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
