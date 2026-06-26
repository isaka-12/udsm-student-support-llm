import React, { createContext, useContext, useState, useCallback } from 'react';
import { streamQuestion, clearHistory, fetchModelInfo as apiFetchModelInfo } from '../services/api';

const ChatContext = createContext(null);

const WELCOME_MSG = {
  id: 1,
  role: 'assistant',
  content: 'Welcome to UDSM Student Support. How can I help you today?',
  timestamp: new Date().toISOString(),
};

export function ChatProvider({ children }) {
  const [messages, setMessages]   = useState([WELCOME_MSG]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isLoading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    const botId = Date.now() + 1;
    const botMsg = {
      id: botId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setIsLoading(true);

    try {
      for await (const event of streamQuestion(content.trim())) {
        if (event.error) {
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, content: event.error, isError: true, streaming: false } : m,
          ));
          return;
        }
        if (event.token) {
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, content: m.content + event.token } : m,
          ));
        }
        if (event.done) {
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, streaming: false, responseTime: event.response_time } : m,
          ));
        }
      }
    } catch (err) {
      const msg = err.name === 'TypeError'
        ? 'Cannot reach the server. Make sure the backend is running.'
        : `Error: ${err.message}`;
      setMessages(prev => prev.map(m =>
        m.id === botId ? { ...m, content: msg, isError: true, streaming: false } : m,
      ));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearMessages = useCallback(async () => {
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: 'Chat cleared. What can I help you with?',
      timestamp: new Date().toISOString(),
    }]);
    try { await clearHistory(); } catch { /* backend may be offline */ }
  }, []);

  const fetchModelInfo = useCallback(async () => {
    try {
      const data = await apiFetchModelInfo();
      setModelInfo(data);
    } catch { /* backend may be offline */ }
  }, []);

  return (
    <ChatContext.Provider value={{ messages, isLoading, modelInfo, sendMessage, clearMessages, fetchModelInfo }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
