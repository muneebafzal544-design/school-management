/**
 * useChat.js
 * Unified hook for the class chat system.
 *
 * Key design decisions:
 *  - canPost is derived LOCALLY from user role + room type — never depends on socket
 *  - Sending a message uses optimistic UI — message appears immediately, replaced
 *    by the real server response; removed on failure
 *  - Socket broadcast is used for OTHER people's messages, not your own
 *  - Works fully in REST-only mode when socket is offline
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';
import { tokenStorage } from '../api/axios';
import {
  getRooms, getMessages as fetchMessages,
  sendMessage as apiSend, editMessage as apiEdit,
  deleteMessage as apiDelete, toggleReaction as apiReact,
  markRead as apiMarkRead, uploadFile as apiUpload,
} from '../api/chat';
import toast from 'react-hot-toast';

const TYPING_DEBOUNCE_MS = 800;

// ── Derive canPost from role + room type (no server round-trip needed) ────────
function deriveCanPost(user, room) {
  if (!user || !room) return false;
  if (user.role === 'admin' || user.role === 'teacher') return true;
  if (user.role === 'student') return room.type === 'class_chat';
  return false;
}

export function useChat(user) {
  const { connect, disconnect, connected, connecting, on, off, emit } = useSocket();

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const [rooms,        setRooms]        = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  // ── Active room ────────────────────────────────────────────────────────────
  const [activeRoom,   setActiveRoom]   = useState(null);
  const [onlineCount,  setOnlineCount]  = useState(0);

  // ── Messages ───────────────────────────────────────────────────────────────
  const [messages,    setMessages]    = useState([]);
  const [hasMore,     setHasMore]     = useState(false);
  const [nextCursor,  setNextCursor]  = useState(null);
  const [msgsLoading, setMsgsLoading] = useState(false);

  // ── Typing ─────────────────────────────────────────────────────────────────
  const [typers,       setTypers]      = useState([]);
  const typingTimerRef  = useRef(null);
  const isTypingRef     = useRef(false);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading,      setUploading]      = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const joinedRoomRef  = useRef(null);
  const activeRoomRef  = useRef(null); // mirror of activeRoom for callbacks
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  // canPost derived from role + room type — always correct, no socket needed
  const canPost = deriveCanPost(user, activeRoom);

  // ─────────────────────────────────────────────────────────────────────────
  // CONNECT ON MOUNT
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (token) connect(token);
    return () => {
      if (joinedRoomRef.current) {
        emit('chat:leave', { roomId: joinedRoomRef.current });
      }
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD ROOMS
  // ─────────────────────────────────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const res = await getRooms();
      // axios interceptor may or may not unwrap — handle both
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setRooms(list);
    } catch {
      toast.error('Could not load chat rooms');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // ─────────────────────────────────────────────────────────────────────────
  // SOCKET EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleMessage = useCallback((msg) => {
    if (msg.room_id !== joinedRoomRef.current) return;
    setMessages(prev => {
      // Replace any optimistic temp message with same content, or dedupe by id
      const withoutTemp = prev.filter(m =>
        !(m._temp && m.content === msg.content && m.sender_id === msg.sender_id)
      );
      if (withoutTemp.find(m => m.id === msg.id)) return withoutTemp; // dedupe
      return [...withoutTemp, { ...msg, reactions: msg.reactions ?? [] }];
    });
    apiMarkRead(msg.room_id, msg.id).catch(() => {});
    setRooms(prev => prev.map(r =>
      r.id === msg.room_id
        ? { ...r, unread_count: 0, last_msg_content: msg.content, last_msg_at: msg.created_at }
        : r
    ));
  }, []);

  const handleEdited = useCallback(({ id, room_id, content, updated_at }) => {
    if (room_id !== joinedRoomRef.current) return;
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content, updated_at } : m));
  }, []);

  const handleDeleted = useCallback(({ id, room_id }) => {
    if (room_id !== joinedRoomRef.current) return;
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, is_deleted: true, content: null, file_url: null } : m
    ));
  }, []);

  const handleReaction = useCallback(({ message_id, room_id, reactions }) => {
    if (room_id !== joinedRoomRef.current) return;
    setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions } : m));
  }, []);

  const handleTyping = useCallback(({ roomId, userId, userName, role }) => {
    if (roomId !== joinedRoomRef.current) return;
    setTypers(prev => prev.find(t => t.userId === userId) ? prev : [...prev, { userId, userName, role }]);
  }, []);

  const handleStopTyping = useCallback(({ roomId, userId }) => {
    if (roomId !== joinedRoomRef.current) return;
    setTypers(prev => prev.filter(t => t.userId !== userId));
  }, []);

  const handlePresence = useCallback(({ roomId, count }) => {
    if (roomId !== joinedRoomRef.current) return;
    setOnlineCount(count);
  }, []);

  useEffect(() => {
    on('chat:message',         handleMessage);
    on('chat:message_edited',  handleEdited);
    on('chat:message_deleted', handleDeleted);
    on('chat:reaction',        handleReaction);
    on('chat:typing',          handleTyping);
    on('chat:stop_typing',     handleStopTyping);
    on('chat:presence',        handlePresence);
    return () => {
      off('chat:message',         handleMessage);
      off('chat:message_edited',  handleEdited);
      off('chat:message_deleted', handleDeleted);
      off('chat:reaction',        handleReaction);
      off('chat:typing',          handleTyping);
      off('chat:stop_typing',     handleStopTyping);
      off('chat:presence',        handlePresence);
    };
  }, [on, off, handleMessage, handleEdited, handleDeleted,
      handleReaction, handleTyping, handleStopTyping, handlePresence]);

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD MESSAGES via REST (always — not just fallback)
  // ─────────────────────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (roomId) => {
    setMsgsLoading(true);
    try {
      const res  = await fetchMessages(roomId, { limit: 30 });
      const raw  = res.data;
      // Response shape: { success, data: { messages, hasMore, nextCursor } }
      const data = raw?.data ?? raw;
      const msgs = data?.messages ?? (Array.isArray(data) ? data : []);
      setMessages(msgs.map(m => ({ ...m, reactions: m.reactions ?? [] })));
      setHasMore(data?.hasMore ?? false);
      setNextCursor(data?.nextCursor ?? null);
    } catch {
      toast.error('Could not load messages');
    } finally {
      setMsgsLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // JOIN ROOM
  // ─────────────────────────────────────────────────────────────────────────
  const joinRoom = useCallback(async (room) => {
    if (joinedRoomRef.current === room.id) return;

    // Leave previous room
    if (joinedRoomRef.current) {
      emit('chat:leave', { roomId: joinedRoomRef.current });
    }

    // Reset state synchronously so UI feels instant
    setActiveRoom(room);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    setTypers([]);
    setOnlineCount(0);
    joinedRoomRef.current = room.id;

    // Load history via REST (reliable, always works)
    await loadMessages(room.id);

    // Also join via socket if connected (for real-time + presence)
    if (connected) {
      emit('chat:join', { roomId: room.id }, true)
        .then(ack => { if (ack?.onlineCount) setOnlineCount(ack.onlineCount); })
        .catch(() => {});
    }
  }, [connected, emit, loadMessages]);

  // Re-join via socket when connection is restored
  useEffect(() => {
    if (connected && joinedRoomRef.current) {
      emit('chat:join', { roomId: joinedRoomRef.current }, true)
        .then(ack => { if (ack?.onlineCount) setOnlineCount(ack.onlineCount); })
        .catch(() => {});
    }
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD MORE (scroll up)
  // ─────────────────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!activeRoomRef.current || !hasMore || msgsLoading || !nextCursor) return;
    setMsgsLoading(true);
    try {
      const res  = await fetchMessages(activeRoomRef.current.id, { before: nextCursor, limit: 30 });
      const raw  = res.data;
      const data = raw?.data ?? raw;
      const older = data?.messages ?? [];
      setMessages(prev => [
        ...older.map(m => ({ ...m, reactions: m.reactions ?? [] })),
        ...prev,
      ]);
      setHasMore(data?.hasMore ?? false);
      setNextCursor(data?.nextCursor ?? null);
    } catch {
      toast.error('Could not load more messages');
    } finally {
      setMsgsLoading(false);
    }
  }, [hasMore, msgsLoading, nextCursor]);

  // ─────────────────────────────────────────────────────────────────────────
  // SEND MESSAGE — optimistic UI, no dependency on socket
  // ─────────────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (content, extras = {}) => {
    if (!activeRoomRef.current || !user) return;

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id:            tempId,
      _temp:         true,
      room_id:       activeRoomRef.current.id,
      sender_id:     user.id,
      sender_name:   user.name,
      sender_role:   user.role,
      content:       content || null,
      file_url:      extras.file_url || null,
      file_name:     extras.file_name || null,
      file_type:     extras.file_type || null,
      message_type:  extras.message_type || 'text',
      is_deleted:    false,
      reactions:     [],
      reply_to_id:   extras.reply_to_id || null,
      reply_content: null,
      reply_sender_name: null,
      created_at:    new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    };

    // Show immediately
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res    = await apiSend(activeRoomRef.current.id, { content, ...extras });
      const raw    = res.data;
      const realMsg = raw?.data ?? raw;

      // Replace temp with real message from server
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...realMsg, reactions: realMsg.reactions ?? [] }
          : m
      ));

      // Update sidebar last message
      setRooms(prev => prev.map(r =>
        r.id === activeRoomRef.current?.id
          ? { ...r, last_msg_content: content, last_msg_at: realMsg.created_at, unread_count: 0 }
          : r
      ));

      // Mark read
      apiMarkRead(activeRoomRef.current.id, realMsg.id).catch(() => {});

    } catch (err) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(err.displayMessage || 'Failed to send message');
    }
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT MESSAGE
  // ─────────────────────────────────────────────────────────────────────────
  const editMessage = useCallback(async (msgId, content) => {
    // Optimistic
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, content, updated_at: new Date().toISOString() } : m
    ));
    try {
      await apiEdit(msgId, content);
    } catch (err) {
      toast.error(err.displayMessage || 'Could not edit message');
      // Revert — reload messages
      if (activeRoomRef.current) loadMessages(activeRoomRef.current.id);
    }
  }, [loadMessages]);

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE MESSAGE
  // ─────────────────────────────────────────────────────────────────────────
  const deleteMessage = useCallback(async (msgId) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, is_deleted: true, content: null, file_url: null } : m
    ));
    try {
      await apiDelete(msgId);
    } catch (err) {
      toast.error(err.displayMessage || 'Could not delete message');
      if (activeRoomRef.current) loadMessages(activeRoomRef.current.id);
    }
  }, [loadMessages]);

  // ─────────────────────────────────────────────────────────────────────────
  // REACT
  // ─────────────────────────────────────────────────────────────────────────
  const reactToMessage = useCallback(async (msgId, emoji) => {
    try {
      const res  = await apiReact(msgId, emoji);
      const data = res.data?.data ?? res.data;
      if (data?.reactions) {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, reactions: data.reactions } : m
        ));
      }
    } catch (err) {
      toast.error(err.displayMessage || 'Could not add reaction');
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // UPLOAD → SEND
  // ─────────────────────────────────────────────────────────────────────────
  const uploadAndSend = useCallback(async (file, replyToId = null) => {
    if (!activeRoomRef.current) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const res  = await apiUpload(activeRoomRef.current.id, file, setUploadProgress);
      const data = res.data?.data ?? res.data;
      await sendMessage(null, {
        ...data,
        reply_to_id: replyToId || undefined,
      });
    } catch (err) {
      toast.error(err.displayMessage || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [sendMessage]);

  // ─────────────────────────────────────────────────────────────────────────
  // TYPING INDICATOR (debounced)
  // ─────────────────────────────────────────────────────────────────────────
  const notifyTyping = useCallback(() => {
    if (!joinedRoomRef.current || !connected) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emit('chat:typing', { roomId: joinedRoomRef.current });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emit('chat:stop_typing', { roomId: joinedRoomRef.current });
    }, TYPING_DEBOUNCE_MS);
  }, [connected, emit]);

  // ─────────────────────────────────────────────────────────────────────────
  // MARK READ
  // ─────────────────────────────────────────────────────────────────────────
  const markRoomRead = useCallback(async () => {
    if (!activeRoomRef.current) return;
    const msgs = messages; // closure capture is fine here
    const lastId = msgs[msgs.length - 1]?.id;
    if (lastId && !String(lastId).startsWith('temp-')) {
      await apiMarkRead(activeRoomRef.current.id, lastId).catch(() => {});
      setRooms(prev => prev.map(r =>
        r.id === activeRoomRef.current?.id ? { ...r, unread_count: 0 } : r
      ));
    }
  }, [messages]);

  return {
    connected, connecting,
    rooms, roomsLoading, loadRooms,
    activeRoom, canPost, onlineCount, joinRoom,
    messages, msgsLoading, hasMore, loadMore,
    sendMessage, editMessage, deleteMessage, reactToMessage,
    uploadAndSend, uploading, uploadProgress,
    typers, notifyTyping,
    markRoomRead,
  };
}
