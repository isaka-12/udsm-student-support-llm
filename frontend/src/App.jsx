import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import ChatInterface from './components/ChatInterface';
import { ChatProvider } from './contexts/ChatContext';
import './App.css';

// UDSM Modern Theme
const udsmTheme = createTheme({
  palette: {
    primary: {
      main: '#003366',
      light: '#1A5276',
      dark: '#001F3F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFD700',
      light: '#FFE082',
      dark: '#F9A825',
      contrastText: '#003366',
    },
    background: {
      default: '#F0F2F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#4A4A6A',
    },
    error: {
      main: '#E74C3C',
    },
    success: {
      main: '#2ECC71',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
    },
    h4: {
      fontWeight: 700,
      color: '#003366',
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      lineHeight: 1.7,
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0 2px 8px rgba(0,0,0,0.04)',
    '0 4px 16px rgba(0,0,0,0.06)',
    '0 8px 32px rgba(0,0,0,0.08)',
    '0 16px 48px rgba(0,0,0,0.1)',
    '0 24px 64px rgba(0,0,0,0.12)',
    ...Array(19).fill('none'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollBehavior: 'smooth',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#003366',
          backgroundImage: 'linear-gradient(135deg, #003366 0%, #1A5276 100%)',
          boxShadow: '0 4px 20px rgba(0, 51, 102, 0.2)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          padding: '10px 24px',
        },
        contained: {
          backgroundColor: '#003366',
          '&:hover': {
            backgroundColor: '#001F3F',
          },
        },
        containedSecondary: {
          backgroundColor: '#FFD700',
          color: '#003366',
          '&:hover': {
            backgroundColor: '#F9A825',
          },
        },
        outlined: {
          borderColor: '#003366',
          color: '#003366',
          '&:hover': {
            backgroundColor: 'rgba(0, 51, 102, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        },
        elevation1: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        },
        elevation2: {
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backgroundColor: '#F8F9FA',
            '& fieldset': {
              borderColor: 'transparent',
            },
            '&:hover fieldset': {
              borderColor: '#003366',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#003366',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={udsmTheme}>
      <CssBaseline />
      <ChatProvider>
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <ChatInterface />
        </Box>
      </ChatProvider>
    </ThemeProvider>
  );
}

export default App;