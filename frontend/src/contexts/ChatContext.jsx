import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  streamQuestion, clearHistory,
  fetchModelInfo as apiFetchModelInfo,
  fetchSessions as apiFetchSessions,
  fetchHistory,
  submitFeedback as apiSubmitFeedback,
} from '../services/api';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

const WELCOME_MSG = {
  id: 1,
  role: 'assistant',
  content: 'Welcome to UDSM Student Support. How can I help you today?',
  timestamp: new Date().toISOString(),
};

const sessionKey = (email) => `udsm_session_${email}`;
const newId = () => crypto.randomUUID();

function restoreSessionId(email) {
  if (!email) return newId();
  return localStorage.getItem(sessionKey(email)) || newId();
}

function historyToMessages(history) {
  return history.map((m, i) => ({
    id: Date.now() + i,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));
}

export function ChatProvider({ children }) {
  const { user } = useAuth();

  const [messages, setMessages]                 = useState([WELCOME_MSG]);
  const [isLoading, setIsLoading]               = useState(false);
  const [modelInfo, setModelInfo]               = useState(null);
  const [sessions, setSessions]                 = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(() => restoreSessionId(user?.email));

  // Persist active session ID per user
  useEffect(() => {
    if (user?.email) {
      localStorage.setItem(sessionKey(user.email), currentSessionId);
    }
  }, [currentSessionId, user?.email]);

  const loadSessions = useCallback(async () => {
    if (!user?.email) return;
    try {
      const data = await apiFetchSessions();
      setSessions(data.sessions || []);
    } catch { /* backend offline */ }
  }, [user?.email]);

  // On login/logout: restore or reset session, load history and session list
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!user?.email) {
      setCurrentSessionId(newId());
      setMessages([WELCOME_MSG]);
      setIsLoading(false);
      setSessions([]);
      return;
    }
    const sid = restoreSessionId(user.email);
    setCurrentSessionId(sid);
    setIsLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchHistory(sid)
      .then(data => {
        const hist = data?.history ?? [];
        setMessages(hist.length > 0 ? historyToMessages(hist) : [WELCOME_MSG]);
      })
      .catch(() => setMessages([WELCOME_MSG]));
    loadSessions();
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const createNewSession = useCallback(() => {
    if (isLoading) return;
    setCurrentSessionId(newId());
    setMessages([WELCOME_MSG]);
    setIsLoading(false);
  }, [isLoading]);

  const switchSession = useCallback(async (sessionId) => {
    if (sessionId === currentSessionId || isLoading) return;
    setCurrentSessionId(sessionId);
    setMessages([WELCOME_MSG]);
    setIsLoading(false);
    try {
      const data = await fetchHistory(sessionId);
      const hist = data?.history ?? [];
      if (hist.length > 0) setMessages(historyToMessages(hist));
    } catch { /* backend offline */ }
  }, [currentSessionId, isLoading]);

  const sendMessage = useCallback(async (content, { model, fileContext } = {}) => {
    if (!content.trim() || isLoading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    const botId  = Date.now() + 1;
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
      for await (const event of streamQuestion(content.trim(), currentSessionId, { model, fileContext })) {
        if (event.error) {
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, content: event.error, isError: true, streaming: false } : m,
          ));
          return;
        }
        if (event.refs) {
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, refs: event.refs } : m,
          ));
        }
        if (event.token) {
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, content: m.content + event.token } : m,
          ));
        }
        if (event.done) {
          setMessages(prev => prev.map(m =>
            m.id === botId ? {
              ...m,
              streaming: false,
              responseTime: event.response_time,
              messageIndex: event.message_index,
            } : m,
          ));
          loadSessions();
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
  }, [isLoading, currentSessionId, loadSessions]);

  const clearMessages = useCallback(async () => {
    try { await clearHistory(currentSessionId); } catch { /* offline */ }
    createNewSession();
  }, [currentSessionId, createNewSession]);

  const deleteSession = useCallback(async (sessionId) => {
    try { await clearHistory(sessionId); } catch { /* offline */ }
    if (sessionId === currentSessionId) createNewSession();
    await loadSessions();
  }, [currentSessionId, createNewSession, loadSessions]);

  const fetchModelInfo = useCallback(async () => {
    try {
      const data = await apiFetchModelInfo();
      setModelInfo(data);
    } catch { /* offline */ }
  }, []);

  const submitFeedback = useCallback(async (messageIndex, rating) => {
    try {
      await apiSubmitFeedback(currentSessionId, messageIndex, rating);
      setMessages(prev => prev.map(m =>
        m.messageIndex === messageIndex ? { ...m, feedback: rating } : m,
      ));
    } catch { /* ignore — feedback is non-critical */ }
  }, [currentSessionId]);

  return (
    <ChatContext.Provider value={{
      messages, isLoading, modelInfo, sessions, currentSessionId,
      sendMessage, clearMessages, fetchModelInfo,
      createNewSession, switchSession, loadSessions, submitFeedback, deleteSession,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
