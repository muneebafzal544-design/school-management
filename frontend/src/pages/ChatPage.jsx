/**
 * ChatPage.jsx
 * Slack-style class chat — sidebar + message panel.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │  Sidebar (rooms)  │  Chat Panel                  │
 *   │  ─ Class 7-B Chat │  ┌──── Header ─────────────┐ │
 *   │  ─ Class 7-B Ann  │  │ Messages (scrollable)   │ │
 *   │  ─ Class 6-A Chat │  │                         │ │
 *   │  ─ Class 6-A Ann  │  │ Typing indicator        │ │
 *   │                   │  └──── Input ──────────────┘ │
 *   └──────────────────────────────────────────────────┘
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Hash, Megaphone, Search, Send, Paperclip, Smile,
  X, ChevronLeft, Users, Wifi, WifiOff, Loader2,
  MoreHorizontal, Edit2, Trash2, Reply, Check, AlertCircle,
  Image as ImageIcon, FileText, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import { searchMessages as apiSearch } from '../api/chat';

// ── Role colours (matching existing project palette) ─────────────────────────
const ROLE_COLOR = {
  admin:   'from-indigo-500 to-violet-500',
  teacher: 'from-sky-500 to-indigo-500',
  student: 'from-orange-400 to-amber-500',
};

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name, role, size = 'sm' }) {
  const sz  = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const grad = ROLE_COLOR[role] || ROLE_COLOR.student;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials(name)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR ROOM ITEM
// ─────────────────────────────────────────────────────────────────────────────
function RoomItem({ room, active, onClick }) {
  const isAnn = room.type === 'announcement';
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      {isAnn
        ? <Megaphone size={15} className={active ? 'text-white/80' : 'text-amber-500'} />
        : <Hash      size={15} className={active ? 'text-white/80' : 'text-indigo-400'} />
      }
      <span className="flex-1 text-sm font-medium truncate">
        {isAnn ? 'Announcements' : 'Class Chat'}
      </span>
      {room.unread_count > 0 && !active && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
          {room.unread_count > 99 ? '99+' : room.unread_count}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE ATTACHMENT PREVIEW
// ─────────────────────────────────────────────────────────────────────────────
function FileAttachment({ msg }) {
  if (msg.message_type === 'image') {
    return (
      <a href={msg.file_url} target="_blank" rel="noreferrer">
        <img
          src={msg.file_url}
          alt={msg.file_name}
          className="max-w-xs max-h-64 rounded-xl object-cover mt-1 cursor-pointer hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }
  return (
    <a
      href={msg.file_url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors max-w-xs"
    >
      <FileText size={18} />
      <span className="text-sm truncate flex-1">{msg.file_name}</span>
      <Download size={14} />
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REACTION BAR
// ─────────────────────────────────────────────────────────────────────────────
function ReactionBar({ reactions, onToggle }) {
  if (!reactions?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
            r.reacted_by_me
              ? 'bg-indigo-100 border-indigo-400 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500 dark:text-indigo-300'
              : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 hover:border-indigo-400'
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-semibold">{r.count}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
const MessageBubble = memo(function MessageBubble({
  msg, isMine, onEdit, onDelete, onReact, onReply, canPost,
}) {
  const [showActions, setShowActions]   = useState(false);
  const [showEmojiPicker, setShowEmoji] = useState(false);
  const [editing, setEditing]           = useState(false);
  const [editVal, setEditVal]           = useState(msg.content || '');

  if (msg.is_deleted) {
    return (
      <div className={`flex gap-2 px-4 py-1 ${isMine ? 'flex-row-reverse' : ''}`}>
        <div className="w-8 h-8 flex-shrink-0" />
        <p className="text-xs text-slate-400 italic">Message deleted</p>
      </div>
    );
  }

  const handleEdit = () => {
    onEdit(msg.id, editVal);
    setEditing(false);
  };

  return (
    <div
      className={`group flex gap-2.5 px-4 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isMine ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}
    >
      <Avatar name={msg.sender_name} role={msg.sender_role} />

      <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender + time */}
        <div className={`flex items-baseline gap-2 mb-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {isMine ? 'You' : msg.sender_name}
          </span>
          <span className="text-[10px] text-slate-400">{fmtTime(msg.created_at)}</span>
          {msg.updated_at !== msg.created_at && (
            <span className="text-[10px] text-slate-400 italic">(edited)</span>
          )}
        </div>

        {/* Reply preview */}
        {msg.reply_content && (
          <div className={`mb-1 px-2 py-1 rounded-lg border-l-2 border-indigo-400 bg-slate-100 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-400 max-w-full ${isMine ? 'items-end text-right border-l-0 border-r-2' : ''}`}>
            <span className="font-semibold">{msg.reply_sender_name}: </span>
            <span className="truncate">{msg.reply_content}</span>
          </div>
        )}

        {/* Bubble */}
        {editing ? (
          <div className="flex gap-2 w-full">
            <textarea
              autoFocus
              rows={Math.min(editVal.split('\n').length, 6)}
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } if (e.key === 'Escape') setEditing(false); }}
              className="flex-1 px-3 py-1.5 text-sm rounded-xl border border-indigo-400 bg-white dark:bg-slate-700 dark:text-white focus:outline-none resize-none"
            />
            <button onClick={handleEdit} className="px-2 text-emerald-600 self-end pb-1"><Check size={16} /></button>
            <button onClick={() => setEditing(false)} className="px-2 text-slate-400 self-end pb-1"><X size={16} /></button>
          </div>
        ) : (
          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isMine
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-tl-sm'
          }`}>
            {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
            {msg.file_url && <FileAttachment msg={msg} />}
          </div>
        )}

        {/* Reactions */}
        <ReactionBar reactions={msg.reactions} onToggle={e => onReact(msg.id, e)} />
      </div>

      {/* Action toolbar (hover) */}
      {showActions && !editing && (
        <div className={`flex items-center gap-0.5 self-center opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'mr-1' : 'ml-1'}`}>
          {/* Quick emoji */}
          <div className="relative">
            <button
              onClick={() => setShowEmoji(v => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              title="React"
            >
              <Smile size={15} />
            </button>
            {showEmojiPicker && (
              <div className={`absolute bottom-8 z-20 flex gap-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl ${isMine ? 'right-0' : 'left-0'}`}>
                {QUICK_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {canPost && (
            <button
              onClick={() => onReply(msg)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Reply"
            >
              <Reply size={15} />
            </button>
          )}

          {isMine && msg.message_type === 'text' && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Edit"
            >
              <Edit2 size={15} />
            </button>
          )}

          {isMine && (
            <button
              onClick={() => onDelete(msg.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DATE DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
function DateDivider({ label }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
function TypingIndicator({ typers }) {
  if (!typers?.length) return null;
  const names = typers.slice(0, 3).map(t => t.userName.split(' ')[0]);
  const label = names.length === 1
    ? `${names[0]} is typing…`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing…`
    : `${names[0]}, ${names[1]} and ${names.length - 2} others are typing…`;

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-slate-400 dark:text-slate-500">
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE INPUT
// ─────────────────────────────────────────────────────────────────────────────
function MessageInput({ onSend, onTyping, onFile, uploading, uploadProgress, disabled, replyTo, onCancelReply }) {
  const [text, setText]     = useState('');
  const fileRef             = useRef(null);

  const submit = (e) => {
    e?.preventDefault();
    const val = text.trim();
    if (!val) return;
    onSend(val);
    setText('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    onTyping();
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-xs">
          <Reply size={12} className="text-indigo-500 flex-shrink-0" />
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">{replyTo.sender_name}:</span>
          <span className="text-slate-500 truncate">{replyTo.content || '[file]'}</span>
          <button onClick={onCancelReply} className="ml-auto text-slate-400 hover:text-slate-600">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="mb-2">
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Uploading… {uploadProgress}%</p>
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        {/* File button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={e => { if (e.target.files[0]) { onFile(e.target.files[0]); e.target.value = ''; } }}
        />

        {/* Text input */}
        <textarea
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={disabled ? 'You cannot post in this channel' : 'Type a message… (Enter to send, Shift+Enter for new line)'}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
          style={{ height: 'auto', minHeight: '44px' }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'; }}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuth();
  const {
    connected, connecting,
    rooms, roomsLoading,
    activeRoom, canPost, onlineCount, joinRoom,
    messages, msgsLoading, hasMore, loadMore,
    sendMessage, editMessage, deleteMessage, reactToMessage,
    uploadAndSend, uploading, uploadProgress,
    typers, notifyTyping, markRoomRead,
  } = useChat(user);

  const [sidebarOpen,  setSidebarOpen]  = useState(true);   // mobile toggle
  const [replyTo,      setReplyTo]      = useState(null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [searchResults,setSearchResults]= useState(null);
  const [searching,    setSearching]    = useState(false);

  const bottomRef  = useRef(null);
  const listRef    = useRef(null);
  const prevMsgLen = useRef(0);

  // Scroll to bottom when new messages arrive (not when loading older)
  useEffect(() => {
    if (messages.length > prevMsgLen.current) {
      const diff = messages.length - prevMsgLen.current;
      if (diff <= 3) { // only auto-scroll for new, not bulk loads
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMsgLen.current = messages.length;
  }, [messages]);

  // Mark read when room becomes visible
  useEffect(() => {
    if (activeRoom) {
      markRoomRead();
      setSearchQuery('');
      setSearchResults(null);
    }
  }, [activeRoom?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll — load older messages when scrolling to top
  const handleScroll = useCallback((e) => {
    if (e.target.scrollTop < 60 && hasMore && !msgsLoading) {
      const prevHeight = e.target.scrollHeight;
      loadMore().then(() => {
        // Preserve scroll position after prepending messages
        requestAnimationFrame(() => {
          e.target.scrollTop = e.target.scrollHeight - prevHeight;
        });
      });
    }
  }, [hasMore, msgsLoading, loadMore]);

  // Search
  const handleSearch = useCallback(async (q) => {
    if (!activeRoom || !q.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await apiSearch(activeRoom.id, q.trim());
      setSearchResults(res.data?.data ?? res.data ?? []);
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  }, [activeRoom]);

  // Send handler (with optional reply)
  const handleSend = (content) => {
    sendMessage(content, replyTo ? { reply_to_id: replyTo.id } : {});
    setReplyTo(null);
  };

  // Group rooms by class
  const grouped = rooms.reduce((acc, r) => {
    const key = r.class_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  // Insert date dividers into message list
  const messagesWithDividers = [];
  let lastDate = '';
  for (const msg of messages) {
    const d = fmtDate(msg.created_at);
    if (d !== lastDate) {
      messagesWithDividers.push({ __divider: true, label: d, id: `div-${d}` });
      lastDate = d;
    }
    messagesWithDividers.push(msg);
  }

  const totalUnread = rooms.reduce((s, r) => s + (r.unread_count || 0), 0);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 overflow-hidden">

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside className={`
          flex-shrink-0 flex flex-col
          w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative absolute z-20 h-full
        `}>

          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Class Chat</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                {connected
                  ? <><Wifi size={10} className="text-emerald-500" /><span className="text-[10px] text-emerald-500">Live</span></>
                  : connecting
                  ? <><Loader2 size={10} className="text-amber-500 animate-spin" /><span className="text-[10px] text-amber-500">Connecting…</span></>
                  : <><WifiOff size={10} className="text-red-400" /><span className="text-[10px] text-red-400">Offline</span></>
                }
              </div>
            </div>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {totalUnread}
              </span>
            )}
          </div>

          {/* Room list */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
            {roomsLoading ? (
              <div className="flex justify-center pt-8">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <p className="text-center text-xs text-slate-400 pt-8">No chat rooms available</p>
            ) : (
              Object.entries(grouped).map(([className, classRooms]) => (
                <div key={className}>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-1">
                    {className}
                  </p>
                  {classRooms.map(r => (
                    <RoomItem
                      key={r.id}
                      room={r}
                      active={activeRoom?.id === r.id}
                      onClick={() => { joinRoom(r); setSidebarOpen(false); }}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Sidebar backdrop (mobile) */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-10 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── CHAT PANEL ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Panel header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            {/* Mobile sidebar toggle */}
            <button
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setSidebarOpen(v => !v)}
            >
              <ChevronLeft size={18} />
            </button>

            {activeRoom ? (
              <>
                {activeRoom.type === 'announcement'
                  ? <Megaphone size={18} className="text-amber-500 flex-shrink-0" />
                  : <Hash      size={18} className="text-indigo-500 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{activeRoom.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    {onlineCount} online
                    {activeRoom.type === 'announcement' && user?.role === 'student' && (
                      <span className="ml-2 text-amber-500">read-only</span>
                    )}
                  </p>
                </div>

                {/* Search */}
                <div className="relative hidden sm:flex items-center">
                  <Search size={14} className="absolute left-2.5 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
                    placeholder="Search…"
                    className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-40 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  {searching && <Loader2 size={12} className="absolute right-2 text-slate-400 animate-spin" />}
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Users size={13} />
                </div>
              </>
            ) : (
              <div className="flex-1">
                <p className="text-sm text-slate-400">Select a room to start chatting</p>
              </div>
            )}
          </div>

          {/* Search results overlay */}
          {searchResults !== null && (
            <div className="absolute top-28 right-4 z-30 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => { setSearchResults(null); setSearchQuery(''); }} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No results found</p>
                ) : searchResults.map(r => (
                  <div key={r.id} className="px-3 py-2">
                    <p className="text-[10px] text-slate-400">{r.sender_name} · {fmtTime(r.created_at)}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{r.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto py-2"
          >
            {/* Empty / loading states */}
            {!activeRoom && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Hash size={48} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Pick a room from the sidebar</p>
                <p className="text-xs mt-1">Class chats and announcements appear here</p>
              </div>
            )}

            {activeRoom && msgsLoading && messages.length === 0 && (
              <div className="flex justify-center pt-12">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            )}

            {activeRoom && !msgsLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Hash size={36} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1">Be the first to say something!</p>
              </div>
            )}

            {/* Load more spinner at top */}
            {msgsLoading && messages.length > 0 && (
              <div className="flex justify-center py-2">
                <Loader2 size={16} className="animate-spin text-slate-400" />
              </div>
            )}

            {/* Messages + date dividers */}
            {messagesWithDividers.map(item =>
              item.__divider ? (
                <DateDivider key={item.id} label={item.label} />
              ) : (
                <MessageBubble
                  key={item.id}
                  msg={item}
                  isMine={item.sender_id === user?.id}
                  canPost={canPost}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  onReact={reactToMessage}
                  onReply={setReplyTo}
                />
              )
            )}

            <div ref={bottomRef} />
          </div>

          {/* Typing indicator */}
          <TypingIndicator typers={typers} />

          {/* Input */}
          {activeRoom && (
            <MessageInput
              onSend={handleSend}
              onTyping={notifyTyping}
              onFile={file => uploadAndSend(file, replyTo?.id)}
              uploading={uploading}
              uploadProgress={uploadProgress}
              disabled={!canPost}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
