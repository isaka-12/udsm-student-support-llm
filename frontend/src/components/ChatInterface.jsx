import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Trash2, Copy, Check, Bot, User, GraduationCap,
  Plus, MessageSquare, BookOpen, Calendar, CreditCard,
  Home, Monitor, Scale, X, Zap, Info, Sun, Moon,
  ChevronLeft, ChevronRight, Menu, LogOut, Settings, UserCircle,
  MoreHorizontal,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import UDSMLogo from '../assets/udsm.png';

const cn = (...classes) => classes.filter(Boolean).join(' ');
const fmt = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

/* ── Data ─────────────────────────────────────────────────────────────────── */

const QUICK = [
  { Icon: BookOpen,   label: 'Course Registration' },
  { Icon: Calendar,   label: 'Academic Calendar'   },
  { Icon: Scale,      label: 'Exam Regulations'    },
  { Icon: Home,       label: 'Hostel Application'  },
  { Icon: CreditCard, label: 'Fee Payment'         },
  { Icon: Monitor,    label: 'ICT Support'         },
  { Icon: Info,       label: 'Admissions Info'     },
];

const HISTORY = [
  { id: 1, title: 'Course Registration Help',   sub: 'Today',     active: true  },
  { id: 2, title: 'Library Opening Hours',      sub: 'Today',     active: false },
  { id: 3, title: 'Exam Attendance Rules',      sub: 'Yesterday', active: false },
  { id: 4, title: 'Hostel Application Process', sub: 'Yesterday', active: false },
  { id: 5, title: 'Fee Payment Deadline',       sub: 'Monday',    active: false },
];

const USER = {
  name: 'Isaka Mtweve',
  email: 'isakamtweve69@gmail.com',
  initials: 'IM',
};

/* ── Profile menu ─────────────────────────────────────────────────────────── */

function ProfileMenu({ collapsed }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const Avatar = ({ size = 'sm' }) => (
    <div className={cn(
      'rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 font-semibold text-white select-none',
      size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm',
    )}>
      {USER.initials}
    </div>
  );

  return (
    <div ref={ref} className="relative border-t border-gray-200 dark:border-zinc-800">
      {/* Popup menu */}
      {open && (
        <div className={cn(
          'absolute bottom-full mb-1 z-50',
          'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/60',
          'rounded-xl shadow-xl dark:shadow-2xl py-1.5 overflow-hidden',
          collapsed ? 'left-full ml-2 w-48' : 'left-2 right-2',
        )}>
          {/* User info header */}
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-zinc-700/50 mb-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{USER.name}</p>
            <p className="text-xs text-zinc-500 truncate">{USER.email}</p>
          </div>

          {[
            { Icon: UserCircle, label: 'Profile' },
            { Icon: Settings,   label: 'Preferences' },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors text-left"
            >
              <Icon className="w-4 h-4 opacity-60" />
              {label}
            </button>
          ))}

          <div className="my-1 border-t border-gray-100 dark:border-zinc-700/50" />

          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      )}

      {/* Trigger */}
      {collapsed ? (
        <button
          onClick={() => setOpen(v => !v)}
          title={USER.name}
          className="w-full flex justify-center py-3 px-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Avatar />
        </button>
      ) : (
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors"
        >
          <Avatar />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{USER.name}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 truncate">{USER.email}</p>
          </div>
          <MoreHorizontal className="w-4 h-4 text-zinc-400 dark:text-zinc-600 flex-shrink-0" />
        </button>
      )}
    </div>
  );
}

/* ── Markdown renderer ────────────────────────────────────────────────────── */

const mdComponents = {
  p:          ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
  em:         ({ children }) => <em className="italic">{children}</em>,
  ul:         ({ children }) => <ul className="list-disc list-outside pl-5 mb-2 space-y-1">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal list-outside pl-5 mb-2 space-y-1">{children}</ol>,
  li:         ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1:         ({ children }) => <h1 className="text-base font-bold mb-1 mt-2">{children}</h1>,
  h2:         ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2">{children}</h2>,
  h3:         ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1.5">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-300 dark:border-zinc-600 pl-3 italic text-zinc-500 dark:text-zinc-400 mb-2">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 dark:text-blue-400 underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-300 break-all"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 overflow-x-auto text-xs font-mono mb-2 mt-1">
      {children}
    </pre>
  ),
  code: ({ children, className }) => (
    <code className={cn('font-mono text-xs', className
      ? ''
      : 'bg-gray-100 dark:bg-zinc-700 rounded px-1 py-0.5 text-zinc-800 dark:text-zinc-200',
    )}>
      {children}
    </code>
  ),
  hr: () => <hr className="border-gray-200 dark:border-zinc-700 my-2" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 dark:border-zinc-600 px-2 py-1 bg-gray-100 dark:bg-zinc-800 font-semibold text-left">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-300 dark:border-zinc-600 px-2 py-1">{children}</td>
  ),
};

/* ── Typing indicator ─────────────────────────────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-amber-500 dark:text-amber-400" />
      </div>
      <div className="bg-white border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700/60 rounded-2xl rounded-tl-none px-4 py-3">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-gray-400 dark:bg-zinc-500 animate-bounce-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Message bubble ───────────────────────────────────────────────────────── */

function Bubble({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex items-start gap-3 mb-5 justify-end">
        <div className="flex flex-col items-end gap-1.5" style={{ maxWidth: '80%' }}>
          <div className="bg-slate-100 border border-slate-200 dark:bg-[#1e3a5f] dark:border-[#2d5080] rounded-2xl rounded-tr-none px-4 py-3">
            <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600">{fmt(message.timestamp)}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 dark:bg-zinc-700 dark:border-zinc-600 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-500 dark:text-zinc-300" />
        </div>
      </div>
    );
  }

  // Bot bubble — streaming: show dots while empty, content+cursor while arriving
  const isStreaming = message.streaming;
  const isEmpty     = !message.content;

  if (isStreaming && isEmpty) {
    return (
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-amber-500 dark:text-amber-400" />
        </div>
        <div className="bg-white border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700/60 rounded-2xl rounded-tl-none px-4 py-3">
          <div className="flex gap-1.5 items-center h-5">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full bg-gray-400 dark:bg-zinc-500 animate-bounce-dot"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 mb-5 group">
      <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-amber-500 dark:text-amber-400" />
      </div>
      <div className="flex flex-col items-start gap-1.5" style={{ maxWidth: '80%' }}>
        <div className={cn(
          'rounded-2xl rounded-tl-none px-4 py-3 text-sm',
          message.isError
            ? 'bg-red-50 border border-red-200 dark:bg-red-950/60 dark:border-red-800/50 text-red-600 dark:text-red-300'
            : 'bg-white border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-100',
        )}>
          {message.isError ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {message.content}
            </ReactMarkdown>
          )}
          {/* blinking cursor while tokens are still arriving */}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-current opacity-70 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
        {!isStreaming && (
          <div className="flex items-center gap-3 pl-0.5">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-600">{fmt(message.timestamp)}</span>
            {message.responseTime && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-600 flex items-center gap-1">
                <Zap className="w-3 h-3" />{message.responseTime.toFixed(1)}s
              </span>
            )}
            <button
              onClick={copy}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied
                ? <><Check className="w-3 h-3 text-emerald-500" /><span className="text-emerald-500">Copied</span></>
                : <><Copy className="w-3 h-3" />Copy</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Welcome screen ───────────────────────────────────────────────────────── */

function Welcome({ onPick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
        <GraduationCap className="w-8 h-8 text-amber-500 dark:text-amber-400" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        UDSM Student Support
      </h2>
      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-10">
        Ask me anything about the University of Dar es Salaam — admissions, courses, fees, exams, and more.
      </p>
      <div className="w-full max-w-xs sm:max-w-sm">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mb-3">
          Common questions
        </p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK.map(({ Icon, label }) => (
            <button
              key={label}
              onClick={() => onPick(label)}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-gray-100/80 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 dark:border-zinc-700/50 dark:hover:border-zinc-600 text-left transition-colors group"
            >
              <Icon className="w-4 h-4 text-amber-600/60 group-hover:text-amber-600 dark:text-amber-500/60 dark:group-hover:text-amber-400 flex-shrink-0 transition-colors" />
              <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-200 leading-tight transition-colors">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Desktop sidebar ──────────────────────────────────────────────────────── */

function DesktopSidebar({ modelInfo, collapsed, onToggle }) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">

      {/* Brand + toggle */}
      {collapsed ? (
        /* ── Collapsed: centred icons ── */
        <div className="flex flex-col items-center gap-2 px-2 py-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
           <img src={UDSMLogo} alt="UDSM Logo" className="w-8 h-8" />
          </div>
          <button
            onClick={onToggle}
            title="Expand sidebar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* ── Expanded: name + collapse button ── */
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
              <img src={UDSMLogo} alt="UDSM Logo" className="w-5 h-5  " />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">UDSM Assistant</p>
              <p className="text-xs text-zinc-500">Student Support</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New Chat */}
      <div className={cn('border-b border-gray-200 dark:border-zinc-800', collapsed ? 'px-2 py-3' : 'p-3')}>
        {collapsed ? (
          <button
            title="New Chat"
            className="w-full flex items-center justify-center p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        ) : (
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-200 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        )}
      </div>

      {/* History */}
      <nav className={cn('flex-1 overflow-y-auto space-y-0.5', collapsed ? 'p-2' : 'p-3')}>
        {!collapsed && (
          <p className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-semibold">
            Recent
          </p>
        )}
        {HISTORY.map(item => (
          <button
            key={item.id}
            title={collapsed ? item.title : undefined}
            className={cn(
              'w-full flex items-center rounded-xl text-left transition-colors',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
              item.active
                ? 'bg-gray-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:bg-gray-100/70 hover:text-zinc-700 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300',
            )}
          >
            <MessageSquare className={cn('flex-shrink-0 opacity-60', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{item.sub}</p>
              </div>
            )}
          </button>
        ))}
      </nav>

      <ProfileMenu collapsed={collapsed} />

    </div>
  );
}

/* ── Mobile drawer sidebar ────────────────────────────────────────────────── */

function MobileSidebar({ onClose }) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
            <img src={UDSMLogo} alt="UDSM Logo" className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">UDSM Assistant</p>
            <p className="text-xs text-zinc-500">Student Support</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 border-b border-gray-200 dark:border-zinc-800">
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-200 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <p className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-semibold">
          Recent
        </p>
        {HISTORY.map(item => (
          <button
            key={item.id}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
              item.active
                ? 'bg-gray-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:bg-gray-100/70 hover:text-zinc-700 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300',
            )}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.title}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{item.sub}</p>
            </div>
          </button>
        ))}
      </nav>

      <ProfileMenu collapsed={false} />
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────────── */

export default function ChatInterface() {
  const { messages, isLoading, modelInfo, sendMessage, clearMessages, fetchModelInfo } = useChat();
  const { dark, toggle: toggleTheme } = useTheme();

  const [input, setInput]           = useState('');
  const [collapsed, setCollapsed]   = useState(false); // desktop sidebar
  const [mobOpen, setMobOpen]       = useState(false); // mobile drawer

  const endRef      = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { fetchModelInfo(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
  useEffect(() => {
    const h = () => { if (window.innerWidth >= 768) setMobOpen(false); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const q = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(q);
  };

  const onKey  = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const onType = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };
  const pick = (label) => { setInput(label); setTimeout(() => textareaRef.current?.focus(), 30); };

  const isWelcome = messages.length === 1 && !isLoading;

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* ── Desktop sidebar (collapses to icon strip, never hides) ────────── */}
      <aside className={cn(
        'hidden md:block flex-shrink-0 border-r border-gray-200 dark:border-zinc-800 overflow-hidden transition-[width] duration-300',
        collapsed ? 'w-14' : 'w-60',
      )}>
        {/* Inner is always full-width so content doesn't wrap during transition */}
        <div className={cn('h-full', collapsed ? 'w-14' : 'w-60')}>
          <DesktopSidebar
            modelInfo={modelInfo}
            collapsed={collapsed}
            onToggle={() => setCollapsed(v => !v)}
          />
        </div>
      </aside>

      {/* ── Mobile drawer overlay ─────────────────────────────────────────── */}
      <div className={cn('fixed inset-0 z-50 md:hidden', !mobOpen && 'pointer-events-none')}>
        <div
          onClick={() => setMobOpen(false)}
          className={cn(
            'absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            mobOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div className={cn(
          'absolute inset-y-0 left-0 w-72 shadow-xl dark:shadow-2xl transition-transform duration-300',
          mobOpen ? 'translate-x-0' : '-translate-x-full',
        )}>
          <MobileSidebar onClose={() => setMobOpen(false)} />
        </div>
      </div>

      {/* ── Main column ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <header className="flex items-center gap-3 px-4 h-14 border-b border-gray-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-sm flex-shrink-0">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobOpen(true)}
            className="md:hidden p-2 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                UDSM Student Support
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span className="text-xs text-zinc-500">
                  Online
                  {modelInfo && (
                    <span className="hidden sm:inline text-zinc-400 dark:text-zinc-600"> · {modelInfo.model}</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={dark ? 'Light mode' : 'Dark mode'}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-gray-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 flex-shrink-0 transition-colors"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Clear chat */}
          <button
            onClick={clearMessages}
            title="Clear chat"
            className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 flex-shrink-0 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </header>

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {isWelcome ? (
            <Welcome onPick={pick} />
          ) : (
            <div className="flex-1 px-4 sm:px-6 py-6">
              <div className="max-w-2xl mx-auto">
                {messages.map(m => <Bubble key={m.id} message={m} />)}
                <div ref={endRef} />
              </div>
            </div>
          )}
        </div>

        {/* Suggestion chips */}
        {messages.length > 1 && messages.length <= 3 && !isLoading && (
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-zinc-800/60 px-4 sm:px-6 py-3">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 overflow-x-auto pb-0.5 sm:flex-wrap scrollbar-none">
                {QUICK.map(({ Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => pick(label)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700/50 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs font-medium flex-shrink-0 whitespace-nowrap transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0  px-4 sm:px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-3 bg-gray-50 dark:bg-zinc-900 border-2 border-gray-300 dark:border-zinc-700/60 focus-within:border-gray-400 dark:focus-within:border-zinc-500 rounded-2xl px-4 py-3 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={onType}
                onKeyDown={onKey}
                placeholder="Ask about UDSM services…"
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 resize-none outline-none leading-relaxed disabled:opacity-40"
                style={{ minHeight: '22px', maxHeight: '140px' }}
              />
              <button
                onClick={send}
                disabled={isLoading || !input.trim()}
                className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed text-white flex items-center justify-center flex-shrink-0 transition-all"
              >
                {isLoading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-700 text-center mt-2 select-none">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
