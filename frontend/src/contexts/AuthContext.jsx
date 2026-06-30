import { createContext, useContext, useState, useCallback } from 'react';
import { loginUser, registerUser, TOKEN_KEY, USER_KEY } from '../services/api';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const isAuthenticated = !!localStorage.getItem(TOKEN_KEY) && !!user;

  const _persist = (token, userData) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const data = await loginUser(email, password);
    _persist(data.access_token, data.user);
  }, []);

  const register = useCallback(async ({ firstName, lastName, email, password }) => {
    const data = await registerUser({ firstName, lastName, email, password });
    _persist(data.access_token, data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
