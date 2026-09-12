import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Plus, Search, X, ChevronLeft,
  User, Users, GraduationCap, CheckCheck, Clock,
  Loader2, AlertCircle, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  getRecipients,
} from '../api/messages';

/* ─── helpers ─────────────────────────────────────── */
const ROLE_COLOR = {
  admin:   { bg: 'from-indigo-500 to-violet-500',  text: 'text-indigo-600 dark:text-indigo-400',  badge: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  teacher: { bg: 'from-sky-500 to-indigo-500',     text: 'text-sky-600 dark:text-sky-400',        badge: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' },
  parent:  { bg: 'from-emerald-500 to-teal-500',   text: 'text-emerald-600 dark:text-emerald-400',badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  student: { bg: 'from-orange-400 to-amber-500',   text: 'text-orange-600 dark:text-orange-400',  badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
};

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60 * 1000)           return 'just now';
  if (diff < 60 * 60 * 1000)      return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function Avatar({ name, role, size = 'md' }) {
  const sz = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' }[size];
  const colors = ROLE_COLOR[role] || ROLE_COLOR.admin;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white font-bold shrink-0`}>
      {initials(name)}
    </div>
  );
}

/* ─── New Conversation Modal ───────────────────────── */
function NewConversationModal({ onClose, onCreated }) {
  const { isDark: dark } = useTheme();
  const [q, setQ]               = useState('');
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState([]);
  const [subject, setSubject]   = useState('');
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const timer = useRef(null);

  const search = useCallback(async (val) => {
    if (!val.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await getRecipients(val);
      const list = res.data?.data ?? res.data;
      setResults(Array.isArray(list) ? list : []);
    } catch { setResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q), 300);
    return () => clearTimeout(timer.current);
  }, [q, search]);

  const toggleRecipient = (r) => {
    setSelected(prev =>
      prev.find(p => p.id === r.id) ? prev.filter(p => p.id !== r.id) : [...prev, r],
    );
  };

  const handleCreate = async () => {
    if (!selected.length) { toast.error('Select at least one recipient'); return; }
    if (!subject.trim())  { toast.error('Enter a subject'); return; }
    setCreating(true);
    try {
      const res = await createConversation({
        subject: subject.trim(),
        recipient_ids: selected.map(r => r.id),
      });
      toast.success('Conversation started');
      onCreated(res.data.data?.id || res.data.id);
      onClose();
    } catch {
      toast.error('Failed to start conversation');
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh] ${dark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <Plus size={16} className="text-white" />
            </div>
            <div>
              <p className={`font-semibold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>New Conversation</p>
              <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Start a new message thread</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Subject */}
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide mb-1.5 block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Child's attendance inquiry"
              className={`w-full px-3 py-2.5 rounded-xl text-sm border transition-colors outline-none focus:ring-2 focus:ring-indigo-500/30 ${dark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}`}
            />
          </div>

          {/* Selected recipients */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(r => {
                const colors = ROLE_COLOR[r.role] || ROLE_COLOR.admin;
                return (
                  <span key={r.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                    {r.name}
                    <button onClick={() => toggleRecipient(r)} className="hover:opacity-70">
                      <X size={11} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Recipient search */}
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide mb-1.5 block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>To</label>
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${dark ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              {searching ? <Loader2 size={14} className="text-indigo-400 animate-spin shrink-0" /> : <Search size={14} className={`shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />}
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search teachers, parents, admin…"
                className={`flex-1 bg-transparent text-sm outline-none ${dark ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
              />
            </div>

            {results.length > 0 && (
              <div className={`mt-1.5 rounded-xl border overflow-hidden ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg`}>
                {results.map(r => {
                  const isSelected = selected.find(p => p.id === r.id);
                  const colors = ROLE_COLOR[r.role] || ROLE_COLOR.admin;
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggleRecipient(r)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b last:border-b-0 ${
                        dark ? 'border-slate-700/50' : 'border-slate-100'
                      } ${
                        isSelected
                          ? dark ? 'bg-indigo-900/20' : 'bg-indigo-50'
                          : dark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-500 border-indigo-500'
                          : dark ? 'border-slate-600' : 'border-slate-300'
                      }`}>
                        {isSelected && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      <Avatar name={r.name} role={r.role} size="sm" />

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${dark ? 'text-white' : 'text-slate-800'}`}>{r.name}</p>
                        {r.extra?.trim() && <p className={`text-xs truncate ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{r.extra}</p>}
                      </div>

                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize border ${
                        r.role === 'teacher' ? (dark ? 'bg-sky-900/30 border-sky-800/40 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-600') :
                        r.role === 'parent'  ? (dark ? 'bg-emerald-900/30 border-emerald-800/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600') :
                        r.role === 'student' ? (dark ? 'bg-amber-900/30 border-amber-800/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600') :
                                               (dark ? 'bg-indigo-900/30 border-indigo-800/40 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600')
                      }`}>
                        {r.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-4 border-t flex justify-end gap-3 ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !selected.length || !subject.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            Start Conversation
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Conversation List Item ───────────────────────── */
function ConvItem({ conv, isActive, onClick, currentUserId, dark }) {
  const others = (conv.participants || []).filter(p => p.user_id !== currentUserId);
  const primaryOther = others[0];
  const displayName = others.length
    ? others.map(p => p.name?.split(' ')[0]).join(', ')
    : 'You';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-150 ${
        isActive
          ? dark ? 'bg-indigo-900/25 border-r-2 border-indigo-400' : 'bg-indigo-50 border-r-2 border-indigo-500'
          : dark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
      }`}
    >
      <div className="relative shrink-0 mt-0.5">
        <Avatar name={primaryOther?.name || 'Unknown'} role={primaryOther?.role || 'admin'} size="md" />
        {others.length > 1 && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-700 border border-slate-900 flex items-center justify-center text-[9px] text-white font-bold">
            +{others.length - 1}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-slate-800'} ${conv.unread_count > 0 ? 'font-bold' : ''}`}>
            {displayName}
          </p>
          <span className={`text-[11px] shrink-0 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            {fmtTime(conv.last_sent_at || conv.updated_at)}
          </span>
        </div>
        <p className={`text-xs truncate mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{conv.subject}</p>
        {conv.last_message && (
          <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? (dark ? 'text-slate-200 font-medium' : 'text-slate-700 font-medium') : (dark ? 'text-slate-500' : 'text-slate-400')}`}>
            {conv.last_message}
          </p>
        )}
        {conv.student_name && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium mt-1 px-1.5 py-0.5 rounded-md ${dark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
            <BookOpen size={9} /> {conv.student_name}
          </span>
        )}
      </div>
      {conv.unread_count > 0 && (
        <span className="shrink-0 mt-1 min-w-[18px] h-[18px] rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold px-1">
          {conv.unread_count > 99 ? '99+' : conv.unread_count}
        </span>
      )}
    </button>
  );
}

/* ─── Message Bubble ──────────────────────────────── */
function Bubble({ msg, isMine, dark }) {
  const colors = ROLE_COLOR[msg.sender_role] || ROLE_COLOR.admin;
  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && (
        <Avatar name={msg.sender_name} role={msg.sender_role} size="sm" />
      )}
      <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <span className={`text-[10px] font-semibold mb-1 ${colors.text}`}>{msg.sender_name}</span>
        )}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
          isMine
            ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-br-sm'
            : dark
              ? 'bg-slate-800 text-slate-100 rounded-bl-sm'
              : 'bg-white text-slate-800 border border-slate-100 shadow-sm rounded-bl-sm'
        }`}>
          {msg.body}
        </div>
        <span className={`text-[10px] mt-1 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
          {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────── */
export default function MessagingPage() {
  const { user }        = useAuth();
  const { isDark: dark } = useTheme();

  const [conversations, setConversations] = useState([]);
  const [activeId,      setActiveId]      = useState(null);
  const [thread,        setThread]        = useState(null);   // { conversation, messages }
  const [draft,         setDraft]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showNew,       setShowNew]       = useState(false);
  const [searchQ,       setSearchQ]       = useState('');
  const [mobileView,    setMobileView]    = useState('list'); // 'list' | 'thread'

  const endRef    = useRef(null);
  const inputRef  = useRef(null);
  const pollTimer = useRef(null);

  /* Load inbox */
  const loadInbox = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getConversations();
      const convs = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setConversations(convs);
    } catch { /* silent */ }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  /* Poll inbox every 30s — skip while the tab isn't visible */
  useEffect(() => {
    pollTimer.current = setInterval(() => {
      if (!document.hidden) loadInbox(true);
    }, 30_000);
    return () => clearInterval(pollTimer.current);
  }, [loadInbox]);

  /* Load thread */
  const loadThread = useCallback(async (id, silent = false) => {
    if (!id) return;
    if (!silent) setLoadingThread(true);
    try {
      const res = await getMessages(id);
      setThread(res.data.data ?? res.data);
      // Refresh unread badge in list
      setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    } catch { toast.error('Failed to load messages'); }
    if (!silent) setLoadingThread(false);
  }, []);

  /* Poll active thread every 10s — skip while the tab isn't visible */
  useEffect(() => {
    const t = activeId ? setInterval(() => {
      if (!document.hidden) loadThread(activeId, true);
    }, 10_000) : null;
    return () => t && clearInterval(t);
  }, [activeId, loadThread]);

  /* Scroll to bottom on new messages */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  const openConv = (id) => {
    setActiveId(id);
    loadThread(id);
    setMobileView('thread');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleNewConv = (newId) => {
    loadInbox();
    openConv(newId);
  };

  const handleSend = async () => {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    try {
      const res = await sendMessage(activeId, text);
      const newMsg = res.data.data ?? res.data;
      setThread(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev);
      // Bump the conversation in list
      setConversations(prev => prev.map(c =>
        c.id === activeId ? { ...c, last_message: text, last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() } : c,
      ).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
    } catch {
      toast.error('Failed to send');
      setDraft(text);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* Filtered list */
  const filtered = conversations.filter(c => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return c.subject?.toLowerCase().includes(q)
      || c.student_name?.toLowerCase().includes(q)
      || (c.participants || []).some(p => p.name?.toLowerCase().includes(q));
  });

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  /* ── Group messages by date ── */
  const groupedMessages = (thread?.messages || []).reduce((acc, msg) => {
    const day = new Date(msg.sent_at).toDateString();
    if (!acc.length || acc[acc.length - 1].day !== day) acc.push({ day, messages: [] });
    acc[acc.length - 1].messages.push(msg);
    return acc;
  }, []);

  /* ── Participants display ── */
  const otherParticipants = (thread?.conversation?.participants || []).filter(p => p.id !== user?.id);

  /* ── Render ── */
  return (
    <Layout>
      <div className={`flex h-[calc(100vh-0px)] overflow-hidden ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>

        {/* ── Left panel: conversation list ── */}
        <div className={`
          flex flex-col shrink-0 border-r transition-all duration-300
          ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}
          ${mobileView === 'thread' ? 'hidden lg:flex' : 'flex'}
          w-full lg:w-80
        `}>
          {/* Panel header */}
          <div className={`px-4 pt-5 pb-3 border-b ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <MessageSquare size={14} className="text-white" />
                </div>
                <div>
                  <h1 className={`text-base font-bold leading-none ${dark ? 'text-white' : 'text-slate-800'}`}>Messages</h1>
                  {totalUnread > 0 && (
                    <p className="text-[11px] text-indigo-500 font-medium">{totalUnread} unread</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowNew(true)}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center hover:opacity-90 transition-opacity shadow-md shadow-indigo-500/30"
                title="New conversation"
              >
                <Plus size={14} className="text-white" />
              </button>
            </div>

            {/* Search */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <Search size={13} className={dark ? 'text-slate-500' : 'text-slate-400'} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search conversations…"
                className={`flex-1 bg-transparent text-xs outline-none ${dark ? 'text-white placeholder-slate-500' : 'text-slate-700 placeholder-slate-400'}`}
              />
              {searchQ && <button onClick={() => setSearchQ('')}><X size={12} className={dark ? 'text-slate-500' : 'text-slate-400'} /></button>}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 size={24} className="text-indigo-400 animate-spin" />
                <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Loading…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <MessageSquare size={22} className={dark ? 'text-slate-600' : 'text-slate-400'} />
                </div>
                <p className={`text-sm font-semibold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {searchQ ? 'No results' : 'No conversations yet'}
                </p>
                {!searchQ && (
                  <button
                    onClick={() => setShowNew(true)}
                    className="text-xs text-indigo-500 hover:text-indigo-400 font-medium transition-colors"
                  >
                    Start your first conversation →
                  </button>
                )}
              </div>
            ) : (
              filtered.map(conv => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeId === conv.id}
                  onClick={() => openConv(conv.id)}
                  currentUserId={user?.id}
                  dark={dark}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: thread ── */}
        <div className={`
          flex-1 flex flex-col min-w-0
          ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}
        `}>
          {!activeId ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${dark ? 'bg-slate-800' : 'bg-white'}`}
                style={{ background: 'linear-gradient(135deg, #6366f115, #8b5cf615)' }}>
                <MessageSquare size={34} className="text-indigo-400" />
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-700'}`}>Your Inbox</p>
                <p className={`text-sm mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Select a conversation or start a new one</p>
              </div>
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
              >
                <Plus size={15} /> New Conversation
              </button>
            </div>
          ) : loadingThread ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={28} className="text-indigo-400 animate-spin" />
            </div>
          ) : thread ? (
            <>
              {/* Thread header */}
              <div className={`flex items-center gap-3 px-5 py-3.5 border-b shrink-0 ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                {/* Mobile back */}
                <button
                  onClick={() => setMobileView('list')}
                  className={`lg:hidden p-1.5 rounded-lg mr-1 ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <ChevronLeft size={18} />
                </button>

                {/* Avatars */}
                <div className="flex -space-x-2 shrink-0">
                  {otherParticipants.slice(0, 3).map(p => (
                    <div key={p.id} className="ring-2 ring-white dark:ring-slate-900 rounded-full">
                      <Avatar name={p.name} role={p.role} size="md" />
                    </div>
                  ))}
                </div>

                {/* Names & subject */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {otherParticipants.map(p => p.name).join(', ') || 'Conversation'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className={`text-xs truncate ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {thread.conversation?.subject}
                    </p>
                    {thread.conversation?.student_name && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${dark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                        <BookOpen size={9} /> {thread.conversation.student_name}
                        {thread.conversation.student_class ? ` — ${thread.conversation.student_class}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role badges for participants */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {otherParticipants.slice(0, 2).map(p => {
                    const colors = ROLE_COLOR[p.role] || ROLE_COLOR.admin;
                    return (
                      <span key={p.id} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${colors.badge}`}>{p.role}</span>
                    );
                  })}
                </div>
              </div>

              {/* Messages area */}
              <div className={`flex-1 overflow-y-auto px-5 py-5 space-y-6 ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                {groupedMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
                    <Clock size={28} className={dark ? 'text-slate-600' : 'text-slate-400'} />
                    <p className={`text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No messages yet. Say hello!</p>
                  </div>
                )}
                {groupedMessages.map(group => (
                  <div key={group.day}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`flex-1 h-px ${dark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                      <span className={`text-[11px] font-medium px-3 py-1 rounded-full ${dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                        {fmtDate(group.messages[0].sent_at)}
                      </span>
                      <div className={`flex-1 h-px ${dark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    </div>

                    {/* Bubbles */}
                    <div className="space-y-3">
                      {group.messages.map(msg => (
                        <Bubble
                          key={msg.id}
                          msg={msg}
                          isMine={msg.sender_id === user?.id}
                          dark={dark}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {/* Compose bar */}
              <div className={`px-4 py-3 border-t shrink-0 ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`flex items-end gap-3 rounded-2xl border px-4 py-3 transition-colors ${dark ? 'bg-slate-800 border-slate-700 focus-within:border-indigo-500/50' : 'bg-slate-50 border-slate-200 focus-within:border-indigo-300'}`}>
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Type a message… (Enter to send)"
                    rows={1}
                    style={{ resize: 'none', minHeight: '24px', maxHeight: '120px', overflow: 'auto' }}
                    className={`flex-1 bg-transparent text-sm outline-none leading-relaxed ${dark ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-md shadow-indigo-500/25"
                  >
                    {sending
                      ? <Loader2 size={15} className="text-white animate-spin" />
                      : <Send size={15} className="text-white" />
                    }
                  </button>
                </div>
                <p className={`text-[10px] mt-1.5 text-center ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
                  Press <kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${dark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>Enter</kbd> to send &nbsp;·&nbsp; <kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${dark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>Shift+Enter</kbd> for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 opacity-60">
                <AlertCircle size={24} className={dark ? 'text-slate-600' : 'text-slate-400'} />
                <p className={`text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Could not load conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewConversationModal
          onClose={() => setShowNew(false)}
          onCreated={handleNewConv}
        />
      )}
    </Layout>
  );
}
