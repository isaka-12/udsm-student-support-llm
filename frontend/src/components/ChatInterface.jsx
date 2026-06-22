import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Paper,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Fade,
  Slide,
  Zoom,
  Stack,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Container,
  useMediaQuery,
  useTheme,
  alpha,
  Skeleton,
  Grow,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListSubheader,
  SwipeableDrawer,
  Collapse,
} from '@mui/material';
import {
  Send as SendIcon,
  School as SchoolIcon,
  DeleteSweep as DeleteIcon,
  SmartToy as RobotIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Speed as SpeedIcon,
  MoreVert as MoreIcon,
  ContentCopy as CopyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Refresh as RefreshIcon,
  WhatsApp as WhatsAppIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Close as CloseIcon,
  ArrowDownward as ArrowDownIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Lightbulb as LightbulbIcon,
  MenuBook as MenuBookIcon,
  LibraryBooks as LibraryBooksIcon,
  Payment as PaymentIcon,
  EventNote as EventNoteIcon,
  Computer as ComputerIcon,
  Home as HomeIcon,
  Gavel as GavelIcon,
  EmojiEvents as EmojiEventsIcon,
  Info as InfoIcon,
  Menu as MenuIcon,
  Chat as ChatIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Search as SearchIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';
import { styled, keyframes } from '@mui/material/styles';

// Animations
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.4);
  }
`;

const typingBounce = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-8px);
  }
`;

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

// Styled Components
const ChatContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#F0F2F5',
  position: 'relative',
  overflow: 'hidden',
}));

const MessageWrapper = styled(Box)(({ theme, isUser }) => ({
  display: 'flex',
  justifyContent: isUser ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(2),
  animation: `${fadeInUp} 0.3s ease`,
  width: '100%',
}));

const MessageBubble = styled(Paper)(({ theme, isUser, isError }) => ({
  maxWidth: '80%',
  padding: theme.spacing(2, 2.5),
  borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
  backgroundColor: isUser ? '#003366' : '#FFFFFF',
  color: isUser ? '#FFFFFF' : '#1A1A2E',
  border: isUser ? 'none' : '1px solid rgba(0, 51, 102, 0.08)',
  boxShadow: isUser 
    ? '0 4px 20px rgba(0, 51, 102, 0.25)' 
    : '0 2px 12px rgba(0, 0, 0, 0.04)',
  position: 'relative',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: isUser 
      ? '0 6px 28px rgba(0, 51, 102, 0.3)' 
      : '0 4px 20px rgba(0, 0, 0, 0.06)',
  },
}));

const AvatarWrapper = styled(Avatar)(({ theme, bgcolor }) => ({
  width: 40,
  height: 40,
  flexShrink: 0,
  backgroundColor: bgcolor || '#003366',
  color: bgcolor ? '#003366' : '#FFFFFF',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
}));

const TypingIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: 6,
  padding: theme.spacing(1.5, 2),
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  borderTopLeftRadius: 4,
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
}));

const TypingDot = styled(Box)(({ theme, delay }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: '#003366',
  animation: `${typingBounce} 1.4s infinite ease-in-out`,
  animationDelay: delay || '0s',
}));

const QuickReplyButton = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  padding: theme.spacing(1, 2.5),
  fontSize: '0.85rem',
  fontWeight: 500,
  backgroundColor: 'white',
  color: '#003366',
  border: '1px solid rgba(0, 51, 102, 0.15)',
  '&:hover': {
    backgroundColor: 'rgba(0, 51, 102, 0.04)',
    borderColor: '#003366',
  },
  textTransform: 'none',
  minHeight: 40,
}));

const ScrollToBottom = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  bottom: 100,
  right: 24,
  backgroundColor: '#003366',
  color: 'white',
  boxShadow: '0 4px 20px rgba(0, 51, 102, 0.3)',
  '&:hover': {
    backgroundColor: '#001F3F',
  },
  zIndex: 10,
  width: 44,
  height: 44,
}));

const SidebarHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
}));

const ChatHistoryItem = styled(ListItemButton)(({ theme, active }) => ({
  borderRadius: 8,
  marginBottom: 4,
  backgroundColor: active ? 'rgba(0, 51, 102, 0.04)' : 'transparent',
  '&:hover': {
    backgroundColor: 'rgba(0, 51, 102, 0.04)',
  },
}));

const drawerWidth = 280;

const ChatInterface = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const { messages, isLoading, modelInfo, sendMessage, clearMessages, fetchModelInfo } = useChat();
  const [input, setInput] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [typing, setTyping] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Sample chat history
  const chatHistory = [
    { id: 1, title: 'Course Registration Help', date: 'Today', preview: 'How do I register...' },
    { id: 2, title: 'Library Hours', date: 'Today', preview: 'What are library...' },
    { id: 3, title: 'Exam Rules', date: 'Yesterday', preview: 'Attendance required...' },
    { id: 4, title: 'Fee Payment', date: 'Yesterday', preview: 'When are fees due...' },
    { id: 5, title: 'Hostel Application', date: '2 days ago', preview: 'How to apply...' },
  ];

  // Quick reply suggestions
  const quickReplies = [
    { icon: <MenuBookIcon />, label: 'Course Registration' },
    { icon: <EventNoteIcon />, label: 'Exam Rules' },
    { icon: <LibraryBooksIcon />, label: 'Library Hours' },
    { icon: <ComputerIcon />, label: 'ICT Support' },
    { icon: <HomeIcon />, label: 'Hostel Application' },
    { icon: <PaymentIcon />, label: 'Fee Payment' },
    { icon: <EmojiEventsIcon />, label: 'Academic Calendar' },
    { icon: <GavelIcon />, label: 'Student Conduct' },
  ];

  // Navigation items
  const navItems = [
    { icon: <DashboardIcon />, label: 'Dashboard', active: true },
    { icon: <ChatIcon />, label: 'Chat', active: false },
    { icon: <HistoryIcon />, label: 'History', active: false },
    { icon: <SettingsIcon />, label: 'Settings', active: false },
    { icon: <HelpIcon />, label: 'Help', active: false },
  ];

  useEffect(() => {
    fetchModelInfo();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput('');
    setTyping(true);
    await sendMessage(question);
    setTyping(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (question) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtered chat history based on search
  const filteredHistory = chatHistory.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sidebar Content
  const sidebarContent = (
    <Box sx={{ 
      width: drawerWidth, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid rgba(0, 0, 0, 0.06)',
    }}>
      {/* Sidebar Header */}
      <SidebarHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AvatarWrapper bgcolor="#FFD700" sx={{ width: 36, height: 36 }}>
            <SchoolIcon sx={{ fontSize: 18 }} />
          </AvatarWrapper>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366' }}>
              UDSM Assistant
            </Typography>
            <Typography variant="caption" color="textSecondary">
              v1.0.0
            </Typography>
          </Box>
        </Box>
        {isMobile && (
          <IconButton onClick={toggleDrawer}>
            <CloseIcon />
          </IconButton>
        )}
      </SidebarHeader>

      {/* Search */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <TextField
          fullWidth
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />,
            sx: {
              borderRadius: 2,
              backgroundColor: '#F8F9FA',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: '#003366' },
              '&.Mui-focused fieldset': { borderColor: '#003366', borderWidth: 2 },
            },
          }}
        />
      </Box>

      {/* Navigation */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, px: 1 }}>
          MAIN MENU
        </Typography>
        {navItems.map((item) => (
          <ListItemButton
            key={item.label}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              backgroundColor: item.active ? 'rgba(0, 51, 102, 0.04)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(0, 51, 102, 0.04)' },
            }}
          >
            <ListItemIcon sx={{ color: item.active ? '#003366' : 'text.secondary', minWidth: 36 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              primaryTypographyProps={{ 
                fontSize: '0.9rem',
                fontWeight: item.active ? 600 : 400,
                color: item.active ? '#003366' : 'text.primary',
              }}
            />
          </ListItemButton>
        ))}
      </Box>

      <Divider />

      {/* Chat History */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, mb: 1 }}>
          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
            RECENT CHATS
          </Typography>
          <IconButton size="small">
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {filteredHistory.map((chat) => (
          <ChatHistoryItem key={chat.id} active={chat.id === 1}>
            <ListItemAvatar sx={{ minWidth: 36 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(0, 51, 102, 0.08)' }}>
                <ChatIcon sx={{ fontSize: 16, color: '#003366' }} />
              </Avatar>
            </ListItemAvatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, noWrap: true }}>
                {chat.title}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ noWrap: true }}>
                {chat.preview}
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ ml: 1, flexShrink: 0 }}>
              {chat.date}
            </Typography>
          </ChatHistoryItem>
        ))}
      </Box>

      {/* Sidebar Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AvatarWrapper sx={{ width: 32, height: 32 }}>
              <PersonIcon sx={{ fontSize: 16 }} />
            </AvatarWrapper>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Student User
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Online
              </Typography>
            </Box>
          </Box>
          <Box>
            <Tooltip title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
              <IconButton size="small" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Logout">
              <IconButton size="small">
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar - Desktop */}
      {!isMobile && (
        <Drawer
          variant="persistent"
          open={drawerOpen}
          sx={{
            width: drawerOpen ? drawerWidth : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              position: 'relative',
              height: '100%',
              borderRight: '1px solid rgba(0, 0, 0, 0.06)',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Sidebar - Mobile */}
      {isMobile && (
        <SwipeableDrawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onOpen={() => setDrawerOpen(true)}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {sidebarContent}
        </SwipeableDrawer>
      )}

      {/* Main Chat Area */}
      <ChatContainer sx={{ flex: 1 }}>
        {/* Modern App Bar */}
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ 
            py: isMobile ? 1 : 1.5,
            px: isMobile ? 2 : 3,
            minHeight: isMobile ? 64 : 72,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton 
                color="inherit" 
                onClick={toggleDrawer}
                sx={{ 
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                }}
              >
                {drawerOpen && !isMobile ? <ChevronLeftIcon /> : <MenuIcon />}
              </IconButton>
              
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#2ECC71',
                    boxShadow: '0 0 0 2px #003366',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                  },
                }}
              >
                <AvatarWrapper 
                  bgcolor="#FFD700"
                  sx={{ 
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                  }}
                >
                  <SchoolIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                </AvatarWrapper>
              </Badge>
              
              <Box sx={{ ml: 1 }}>
                <Typography 
                  variant={isMobile ? 'subtitle1' : 'h6'} 
                  sx={{ 
                    fontWeight: 700,
                    color: 'white',
                    lineHeight: 1.2,
                  }}
                >
                  UDSM Assistant
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label="UDSM"
                    size="small"
                    sx={{
                      backgroundColor: '#FFD700',
                      color: '#003366',
                      fontWeight: 700,
                      height: 20,
                      fontSize: '0.6rem',
                    }}
                  />
                  {modelInfo && (
                    <Chip
                      label={modelInfo.model}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        height: 20,
                        fontSize: '0.6rem',
                      }}
                    />
                  )}
                  <Chip
                    label="● Online"
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(46, 204, 113, 0.2)',
                      color: '#2ECC71',
                      height: 20,
                      fontSize: '0.6rem',
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ flex: 1 }} />

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Clear Chat">
                <IconButton 
                  color="inherit" 
                  onClick={clearMessages}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="More">
                <IconButton 
                  color="inherit"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  <MoreIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  minWidth: 200,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                },
              }}
            >
              <MenuItem onClick={() => { clearMessages(); setAnchorEl(null); }}>
                <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Clear Chat</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); }}>
                <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Refresh</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem sx={{ color: 'text.secondary' }}>
                <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Version 1.0.0</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Messages Area */}
        <Box
          ref={messagesContainerRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: isMobile ? 2 : isTablet ? 3 : 4,
            py: 3,
            backgroundColor: '#F0F2F5',
            position: 'relative',
          }}
        >
          <Container maxWidth="lg" sx={{ height: '100%' }}>
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              
              return (
                <Grow in={true} timeout={300 + index * 50} key={message.id}>
                  <div>
                    <MessageWrapper isUser={isUser}>
                      {!isUser && (
                        <AvatarWrapper 
                          bgcolor="#FFD700"
                          sx={{ 
                            mr: 1.5,
                            width: isMobile ? 32 : 40,
                            height: isMobile ? 32 : 40,
                          }}
                        >
                          <RobotIcon sx={{ fontSize: isMobile ? 16 : 20 }} />
                        </AvatarWrapper>
                      )}
                      
                      <Box sx={{ maxWidth: isMobile ? '85%' : '80%' }}>
                        <MessageBubble isUser={isUser} isError={message.isError}>
                          <Typography
                            variant="body1"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordWrap: 'break-word',
                              lineHeight: 1.7,
                              fontSize: isMobile ? '0.95rem' : '1rem',
                            }}
                          >
                            {message.content}
                          </Typography>
                        </MessageBubble>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          mt: 0.5,
                          ml: isUser ? 0 : 1,
                          justifyContent: isUser ? 'flex-end' : 'flex-start',
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TimeIcon sx={{ fontSize: 12, color: 'text.secondary', opacity: 0.6 }} />
                            <Typography variant="caption" color="textSecondary" sx={{ opacity: 0.7 }}>
                              {formatTime(message.timestamp)}
                            </Typography>
                          </Box>
                          
                          {!isUser && message.model && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <SpeedIcon sx={{ fontSize: 12, color: 'text.secondary', opacity: 0.6 }} />
                              <Typography variant="caption" color="textSecondary" sx={{ opacity: 0.7 }}>
                                {message.responseTime?.toFixed(1)}s
                              </Typography>
                            </Box>
                          )}
                          
                          {!isUser && (
                            <Tooltip title="Copy">
                              <IconButton 
                                size="small" 
                                onClick={() => handleCopy(message.content)}
                                sx={{ 
                                  p: 0.5,
                                  opacity: 0.4,
                                  '&:hover': { opacity: 1 },
                                }}
                              >
                                <CopyIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                      
                      {isUser && (
                        <AvatarWrapper 
                          sx={{ 
                            ml: 1.5,
                            width: isMobile ? 32 : 40,
                            height: isMobile ? 32 : 40,
                          }}
                        >
                          <PersonIcon sx={{ fontSize: isMobile ? 16 : 20 }} />
                        </AvatarWrapper>
                      )}
                    </MessageWrapper>
                  </div>
                </Grow>
              );
            })}

            {/* Typing Indicator */}
            {(isLoading || typing) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <AvatarWrapper 
                  bgcolor="#FFD700"
                  sx={{ 
                    width: isMobile ? 32 : 40,
                    height: isMobile ? 32 : 40,
                  }}
                >
                  <RobotIcon sx={{ fontSize: isMobile ? 16 : 20 }} />
                </AvatarWrapper>
                <TypingIndicator>
                  <TypingDot delay="0s" />
                  <TypingDot delay="0.2s" />
                  <TypingDot delay="0.4s" />
                </TypingIndicator>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Container>
        </Box>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <Zoom in={showScrollButton}>
            <ScrollToBottom onClick={scrollToBottom}>
              <ArrowDownIcon />
            </ScrollToBottom>
          </Zoom>
        )}

        {/* Quick Replies */}
        {messages.length === 1 && !isLoading && (
          <Box
            sx={{
              px: isMobile ? 2 : 3,
              pb: 2,
              backgroundColor: '#F0F2F5',
              borderTop: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <Container maxWidth="lg">
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5, fontWeight: 500 }}>
                Quick Questions
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                justifyContent: isMobile ? 'center' : 'flex-start',
              }}>
                {quickReplies.map((reply, index) => (
                  <QuickReplyButton
                    key={index}
                    startIcon={reply.icon}
                    onClick={() => handleQuickReply(reply.label)}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    {isMobile ? reply.label.substring(0, 12) + (reply.label.length > 12 ? '...' : '') : reply.label}
                  </QuickReplyButton>
                ))}
              </Box>
            </Container>
          </Box>
        )}

        {/* Input Area */}
        <Paper
          elevation={3}
          sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: 'white',
            borderTop: '1px solid rgba(0, 51, 102, 0.06)',
            borderRadius: 0,
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={isMobile ? 3 : 4}
                placeholder={isMobile ? "Ask about UDSM..." : "Ask about UDSM services..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                variant="outlined"
                inputRef={inputRef}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
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
                }}
              />
              <Button
                variant="contained"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                sx={{
                  minWidth: isMobile ? 48 : 56,
                  minHeight: isMobile ? 48 : 56,
                  borderRadius: 3,
                  backgroundColor: '#003366',
                  '&:hover': {
                    backgroundColor: '#001F3F',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#CCD9E8',
                  },
                  px: isMobile ? 1.5 : 3,
                }}
              >
                {isLoading ? (
                  <CircularProgress size={isMobile ? 20 : 24} color="inherit" />
                ) : (
                  <SendIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                )}
              </Button>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1,
              flexWrap: 'wrap',
              gap: 1,
            }}>
              <Typography variant="caption" color="textSecondary" sx={{ opacity: 0.7 }}>
                {isMobile ? 'Enter to send' : 'Press Enter to send • Shift+Enter for new line'}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="textSecondary" sx={{ opacity: 0.6, display: isMobile ? 'none' : 'block' }}>
                  UDSM • Education for Service
                </Typography>
                <Tooltip title="WhatsApp">
                  <IconButton size="small" sx={{ color: '#25D366', p: 0.5 }}>
                    <WhatsAppIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Facebook">
                  <IconButton size="small" sx={{ color: '#1877F2', p: 0.5 }}>
                    <FacebookIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Twitter">
                  <IconButton size="small" sx={{ color: '#1DA1F2', p: 0.5 }}>
                    <TwitterIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Container>
        </Paper>

        {/* Typing indicator overlay */}
        {isLoading && (
          <Fade in={isLoading}>
            <Box
              sx={{
                position: 'fixed',
                bottom: isMobile ? 80 : 100,
                left: isMobile ? 16 : 24,
                backgroundColor: 'white',
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                zIndex: 1000,
              }}
            >
              <AvatarWrapper 
                bgcolor="#FFD700"
                sx={{ width: 32, height: 32 }}
              >
                <RobotIcon sx={{ fontSize: 16 }} />
              </AvatarWrapper>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box sx={{ 
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  backgroundColor: '#003366',
                  animation: `${typingBounce} 1.4s infinite ease-in-out`,
                }} />
                <Box sx={{ 
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  backgroundColor: '#003366',
                  animation: `${typingBounce} 1.4s infinite ease-in-out`,
                  animationDelay: '0.2s',
                }} />
                <Box sx={{ 
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  backgroundColor: '#003366',
                  animation: `${typingBounce} 1.4s infinite ease-in-out`,
                  animationDelay: '0.4s',
                }} />
              </Box>
            </Box>
          </Fade>
        )}
      </ChatContainer>
    </Box>
  );
};

export default ChatInterface;