import api from './axios';

export const getConversations    = ()              => api.get('/messages/conversations');
export const createConversation  = (data)          => api.post('/messages/conversations', data);
export const getMessages         = (id)            => api.get(`/messages/conversations/${id}`);
export const sendMessage         = (id, body)      => api.post(`/messages/conversations/${id}/messages`, { body });
export const getRecipients       = (q = '')        => api.get('/messages/recipients', { params: { q } });
export const getUnreadCount      = ()              => api.get('/messages/unread-count');
export const flagRequiresMeeting = (id, data)      => api.patch(`/messages/conversations/${id}/flag-meeting`, data);
