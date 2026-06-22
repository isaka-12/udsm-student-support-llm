import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: `👋 Welcome to UDSM Student Support Assistant!

I'm here to help you with everything at the University of Dar es Salaam:

How can I assist you today? 🤝`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);

  const sendMessage = useCallback(async (content) => {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/ask`, {
        question: content,
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.answer || 'I apologize, but I couldn\'t process your request. Please try again.',
        timestamp: new Date().toISOString(),
        model: response.data.model,
        responseTime: response.data.response_time,
        tokensUsed: response.data.tokens_used,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      return { success: true };
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: error.response?.data?.error || 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: "Chat history cleared! How can I help you today?",
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const fetchModelInfo = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/model-info`);
      setModelInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch model info:', error);
    }
  }, []);

  return (
    <ChatContext.Provider value={{
      messages,
      isLoading,
      modelInfo,
      sendMessage,
      clearMessages,
      fetchModelInfo,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};