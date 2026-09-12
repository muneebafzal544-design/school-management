/**
 * ChatbotWidget.jsx
 * A floating AI-powered school assistant available on every page.
 *
 * Features:
 *  - Floating action button (bottom-right, always visible)
 *  - Smooth open/close animation
 *  - Role-specific quick-action buttons
 *  - Typing indicator (animated dots)
 *  - Auto-scroll to latest message
 *  - Keyboard submit (Enter) + Shift+Enter for newlines
 *  - Markdown-ish text rendering (*bold*, line breaks)
 *  - Unread badge when closed and a new bot message arrives
 *  - Persistent chat history per session
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sendChatbotQuery } from '../../api/chatbot';

// ── Quick-action chips per role ───────────────────────────────────────────────
const QUICK_ACTIONS = {
  student: [
    { label: '📊 Attendance',  query: 'What is my attendance?' },
    { label: '💰 Fees',        query: 'Do I have pending fees?' },
    { label: '📚 Timetable',   query: 'Show my timetable for today' },
    { label: '🚌 Bus Status',  query: 'Where is my bus?' },
    { label: '📝 Homework',    query: 'Show pending homework' },
    { label: '📋 Exams',       query: 'Upcoming exams' },
    { label: '📢 Notices',     query: 'Latest announcements' },
  ],
  parent: [
    { label: '📊 Attendance',  query: 'What is my child attendance?' },
    { label: '💰 Fees',        query: 'Are there any pending fees?' },
    { label: '🚌 Bus Status',  query: 'Where is the school bus?' },
    { label: '📝 Homework',    query: 'Pending homework' },
    { label: '📋 Exams',       query: 'Upcoming exams' },
    { label: '📢 Notices',     query: 'Latest announcements' },
  ],
  teacher: [
    { label: '📋 Absent Today', query: 'Which students are absent today?' },
    { label: '📚 Timetable',    query: 'Show my timetable' },
    { label: '📝 Homework',     query: 'Pending homework' },
    { label: '📢 Notices',      query: 'Latest announcements' },
  ],
  admin: [
    { label: '📋 Absent Today',  query: 'Which students are absent today?' },
    { label: '💸 Defaulters',    query: 'Show fee defaulters' },
    { label: '📊 Attendance',    query: 'Attendance report' },
    { label: '💰 Fees',          query: 'Fee status overview' },
    { label: '📢 Notices',       query: 'Latest announcements' },
  ],
};

// ── Render bot message with basic markdown ────────────────────────────────────
function BotMessage({ text }) {
  return (
    <div className="space-y-0.5 leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        // Parse *bold* spans
        const segments = line.split(/(\*[^*]+\*)/g);
        return (
          <div key={i}>
            {segments.map((seg, j) =>
              seg.startsWith('*') && seg.endsWith('*') && seg.length > 2
                ? <strong key={j} className="font-semibold">{seg.slice(1, -1)}</strong>
                : <span key={j}>{seg}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Typing dots indicator ─────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 150, 300].map((delay) => (
        <div
          key={delay}
          className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
        />
      ))}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function ChatbotWidget() {
  const { user } = useAuth();

  const [open,        setOpen]        = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [greeted,     setGreeted]     = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const quickActions = QUICK_ACTIONS[user?.role] || QUICK_ACTIONS.student;
  const firstName    = (user?.name || 'there').split(' ')[0];

  // Auto-greet on first open
  useEffect(() => {
    if (!user) return;
    if (open && !greeted) {
      setGreeted(true);
      appendBot(
        `Hello ${firstName}! 👋 I\'m your School Assistant.\n\n` +
        `I can help you with *attendance*, *fees*, *timetable*, *transport*, and more.\n\n` +
        `Tap a quick action below or just type your question!`
      );
    }
  }, [open, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      setUnreadCount(0);
    }
  }, [open]);

  // All helper functions defined before the early return so hooks count is always consistent
  function appendBot(text) {
    setMessages(prev => [...prev, { from: 'bot', text, id: Date.now() + Math.random() }]);
    if (!open) setUnreadCount(n => n + 1);
  }

  function appendUser(text) {
    setMessages(prev => [...prev, { from: 'user', text, id: Date.now() + Math.random() }]);
  }

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    appendUser(trimmed);
    setInput('');
    setLoading(true);

    try {
      const r = await sendChatbotQuery(trimmed);
      // Response is { success, data: { intent, response } } — not an array,
      // so axios interceptor does NOT unwrap it. r.data = full wrapper object.
      const responseText =
        r.data?.data?.response ??
        r.data?.response ??
        "Sorry, I couldn't process that request.";
      appendBot(responseText);
    } catch {
      appendBot('⚠️ Unable to connect to the assistant. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guard is AFTER all hooks/callbacks so hook count stays constant every render
  if (!user) return null;

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const showQuickActions = messages.length <= 1 && !loading;

  return (
    <>
      {/* ── Chat popup ─────────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 right-4 z-50 w-[370px] max-w-[calc(100vw-1.5rem)]
                    bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
                    border border-slate-200 dark:border-slate-700
                    flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
                    ${open
                      ? 'opacity-100 scale-100 pointer-events-auto'
                      : 'opacity-0 scale-90 pointer-events-none'
                    }`}
        style={{ height: '540px' }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm leading-tight">School Assistant</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span className="text-indigo-200 text-xs">Always here to help</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white text-sm transition-colors"
            aria-label="Close chatbot"
          >
            ✕
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50 dark:bg-slate-900/40 scroll-smooth">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 dark:text-slate-500 text-xs pt-8">
              Ask me anything about your school!
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Bot avatar */}
              {msg.from === 'bot' && (
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-base shrink-0 mt-0.5">
                  🤖
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2.5 text-sm shadow-sm
                  ${msg.from === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                  }`}
              >
                {msg.from === 'bot'
                  ? <BotMessage text={msg.text} />
                  : <span>{msg.text}</span>
                }
              </div>

              {/* User avatar */}
              {msg.from === 'user' && (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                  {firstName[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-base shrink-0">
                🤖
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions — shown only at the start */}
        {showQuickActions && (
          <div className="px-3 pt-2 pb-1.5 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wide">
              Quick actions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.query)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium
                             bg-indigo-50 dark:bg-indigo-900/30
                             text-indigo-700 dark:text-indigo-300
                             border border-indigo-200 dark:border-indigo-700
                             hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                             transition-colors disabled:opacity-40 active:scale-95"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-3 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-end gap-2 shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about fees, attendance, bus…"
            disabled={loading}
            rows={1}
            className="flex-1 resize-none text-sm rounded-xl
                       border border-slate-200 dark:border-slate-600
                       bg-slate-50 dark:bg-slate-700
                       text-slate-800 dark:text-slate-100
                       placeholder-slate-400 dark:placeholder-slate-500
                       px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400
                       disabled:opacity-50"
            style={{ maxHeight: '80px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700
                       text-white flex items-center justify-center shrink-0
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors active:scale-95"
            aria-label="Send message"
          >
            {/* Send icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22 11 13 2 9l20-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Floating action button ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full shadow-xl
                    flex items-center justify-center text-white text-2xl
                    transition-all duration-300 active:scale-95
                    ${open
                      ? 'bg-slate-600 hover:bg-slate-700 rotate-90'
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-300/50 hover:shadow-2xl'
                    }`}
        title={open ? 'Close assistant' : 'School Assistant'}
        aria-label="Open school chatbot assistant"
      >
        {open ? '✕' : '🤖'}

        {/* Unread badge */}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
