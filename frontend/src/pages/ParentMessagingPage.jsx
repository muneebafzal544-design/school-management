import { useEffect, useState, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Plus, X, Search,
  CalendarCheck, CheckCheck, Users, ArrowLeft,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import {
  getConversations, createConversation,
  getMessages, sendMessage, getRecipients,
  flagRequiresMeeting,
} from '../api/messages';
import toast from 'react-hot-toast';

/* ── helpers ── */
function relTime(ts) {
  if (!ts) return '';
  const diff  = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
}

function roleColor(role) {
  if (role === 'teacher') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
  if (role === 'admin')   return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (role === 'parent')  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  return 'bg-slate-100 text-slate-600';
}

/* ── New Conversation Modal ── */
function NewConvModal({ onClose, onCreated }) {
  const [subject,    setSubject]    = useState('');
  const [query,      setQuery]      = useState('');
  const [recipients, setRecipients] = useState([]);  // selected users
  const [results,    setResults]    = useState([]);
  const [searching,  setSearching]  = useState(false);
  const [saving,     setSaving]     = useState(false);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await getRecipients(q);
      setResults(res.data?.data || []);
    } catch { /* silent */ }
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const addRecipient = (u) => {
    if (!recipients.find(r => r.id === u.id)) setRecipients(p => [...p, u]);
    setQuery(''); setResults([]);
  };

  const handleSubmit = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!recipients.length) { toast.error('Select at least one recipient'); return; }
    setSaving(true);
    try {
      const res = await createConversation({
        subject:       subject.trim(),
        recipient_ids: recipients.map(r => r.id),
      });
      toast.success('Conversation started');
      onCreated(res.data?.data?.id);
    } catch {
      toast.error('Failed to start conversation');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-white">New Message</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Subject</label>
            <input
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="e.g. Question about homework"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          {/* Recipient search */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">To (search teachers)</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Search by name…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {results.length > 0 && (
              <div className="mt-1 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg">
                {results.map(u => (
                  <button key={u.id} onClick={() => addRecipient(u)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-left">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                      {(u.name || 'U')[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{u.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{u.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recipients.map(r => (
                  <span key={r.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                    {r.name}
                    <button onClick={() => setRecipients(p => p.filter(x => x.id !== r.id))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {saving ? 'Starting…' : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Thread View ── */
function ThreadView({ convId, currentUser, onBack, onRefreshList }) {
  const [data,    setData]    = useState(null);
  const [body,    setBody]    = useState('');
  const [sending, setSending] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const endRef  = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await getMessages(convId);
      setData(res.data?.data || null);
    } catch { /* silent */ }
  }, [convId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages]);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await sendMessage(convId, body.trim());
      setBody('');
      await load();
      onRefreshList();
    } catch { toast.error('Failed to send'); }
    setSending(false);
  };

  const handleFlag = async () => {
    if (!data) return;
    const next = !data.conversation.requires_meeting;
    setFlagging(true);
    try {
      await flagRequiresMeeting(convId, { requires_meeting: next });
      setData(p => ({ ...p, conversation: { ...p.conversation, requires_meeting: next } }));
      toast.success(next ? 'Marked as requires meeting' : 'Meeting flag removed');
    } catch { toast.error('Failed to update'); }
    setFlagging(false);
  };

  if (!data) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { conversation, messages } = data;
  const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden mr-1">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 dark:text-white truncate text-sm">{conversation.subject}</p>
          {conversation.student_name && (
            <p className="text-[11px] text-slate-400">re: {conversation.student_name} · {conversation.student_class}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {(conversation.participants || []).map(p => (
              <span key={p.user_id} className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${roleColor(p.role)}`}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
        {/* Requires Meeting flag — teachers/admins only */}
        {isTeacherOrAdmin && (
          <button
            onClick={handleFlag}
            disabled={flagging}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              conversation.requires_meeting
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <CalendarCheck size={12} />
            {conversation.requires_meeting ? 'Meeting Required' : 'Needs Meeting?'}
          </button>
        )}
      </div>

      {/* Requires-meeting banner */}
      {conversation.requires_meeting && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <CalendarCheck size={14} className="text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
            Teacher has requested a Parent-Teacher Meeting for this discussion.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map(msg => {
          const isMine = msg.sender_id === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMine && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold mb-0.5 self-start ${roleColor(msg.sender_role)}`}>
                    {msg.sender_name}
                  </span>
                )}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMine
                    ? 'bg-emerald-500 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-sm'
                }`}>
                  {msg.body}
                </div>
                <span className="text-[10px] text-slate-400 px-1">{relTime(msg.sent_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Compose */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            placeholder="Type a message…"
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !body.trim()}
            className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ParentMessagingPage() {
  const { user }     = useAuth();
  const [convs,      setConvs]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeId,   setActiveId]   = useState(null);
  const [showNew,    setShowNew]    = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'thread'

  const loadConvs = useCallback(async () => {
    try {
      const res = await getConversations();
      setConvs(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  const openConv = (id) => {
    setActiveId(id);
    setMobileView('thread');
  };

  const handleCreated = (id) => {
    setShowNew(false);
    loadConvs();
    openConv(id);
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      {showNew && <NewConvModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}

      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Page header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <MessageSquare size={20} className="text-emerald-500" />
          <h1 className="text-xl font-extrabold text-slate-800 dark:text-white flex-1">Messages</h1>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> New Message
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Conversation list */}
          <div className={`w-full lg:w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col ${mobileView === 'thread' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {convs.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                  <MessageSquare size={32} strokeWidth={1.5} />
                  <p className="text-sm">No conversations yet</p>
                  <button onClick={() => setShowNew(true)}
                    className="text-emerald-500 text-sm font-semibold hover:underline">
                    Start a conversation
                  </button>
                </div>
              ) : (
                convs.map(c => (
                  <button
                    key={c.id}
                    onClick={() => openConv(c.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 ${activeId === c.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-sm shrink-0 mt-0.5">
                      {(c.participants?.[0]?.name || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate flex-1">{c.subject}</p>
                        {c.requires_meeting && (
                          <CalendarCheck size={12} className="text-amber-500 shrink-0" />
                        )}
                        {c.unread_count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {c.participants?.map(p => p.name).join(', ') || '—'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{c.last_message || 'No messages yet'}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{relTime(c.last_sent_at)}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Thread panel */}
          <div className={`flex-1 flex flex-col min-h-0 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
            {activeId ? (
              <ThreadView
                key={activeId}
                convId={activeId}
                currentUser={user}
                onBack={() => setMobileView('list')}
                onRefreshList={loadConvs}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                <MessageSquare size={40} strokeWidth={1.2} />
                <p className="text-sm">Select a conversation to read</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
