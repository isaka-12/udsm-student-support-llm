import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider }   from './contexts/ThemeContext';
import { AuthProvider }    from './contexts/AuthContext';
import { ChatProvider }    from './contexts/ChatContext';
import ProtectedRoute      from './components/auth/ProtectedRoute';
import LoginPage           from './pages/LoginPage';
import RegisterPage        from './pages/RegisterPage';
import ChatPage            from './pages/ChatPage';
import './App.css';

const router = createBrowserRouter([
  { path: '/',         element: <Navigate to="/login" replace /> },
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/chat', element: <ChatPage /> },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <RouterProvider router={router} />
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
