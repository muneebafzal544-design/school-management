import api from './axios';

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const getRooms          = ()           => api.get('/chat/rooms');
export const getRoom           = (id)         => api.get(`/chat/rooms/${id}`);
export const getRoomMembers    = (id)         => api.get(`/chat/rooms/${id}/members`);
export const searchMessages    = (id, q)      => api.get(`/chat/rooms/${id}/search`, { params: { q } });

// ── Messages ──────────────────────────────────────────────────────────────────
export const getMessages = (roomId, { before, limit = 30 } = {}) =>
  api.get(`/chat/rooms/${roomId}/messages`, { params: { before, limit } });

export const sendMessage = (roomId, body) =>
  api.post(`/chat/rooms/${roomId}/messages`, body);

export const editMessage   = (id, content) => api.put(`/chat/messages/${id}`, { content });
export const deleteMessage = (id)          => api.delete(`/chat/messages/${id}`);

// ── Reactions ─────────────────────────────────────────────────────────────────
export const toggleReaction = (messageId, emoji) =>
  api.post(`/chat/messages/${messageId}/reactions`, { emoji });

// ── Read receipts ─────────────────────────────────────────────────────────────
export const markRead = (roomId, messageId) =>
  api.put(`/chat/rooms/${roomId}/read`, { message_id: messageId });

// ── File upload ───────────────────────────────────────────────────────────────
export const uploadFile = (roomId, file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/chat/rooms/${roomId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  });
};
