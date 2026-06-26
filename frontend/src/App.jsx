import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import './App.css';

export default function App() {
  const [page, setPage] = useState('login');

  return (
    <ThemeProvider>
      <ChatProvider>
        {page === 'login'
          ? <LoginPage onLogin={() => setPage('chat')} />
          : <ChatPage onLogout={() => setPage('login')} />}
      </ChatProvider>
    </ThemeProvider>
  );
}
