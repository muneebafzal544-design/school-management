import api from './axios';

export const getNotifications    = ()    => api.get('/notifications');
export const getUnreadCount      = ()    => api.get('/notifications/unread-count');
export const generateNotifications = ()  => api.post('/notifications/generate');
export const markRead            = (id)  => api.patch(`/notifications/${id}/read`);
export const markAllRead         = ()    => api.post('/notifications/mark-all-read');
export const deleteNotification  = (id)  => api.delete(`/notifications/${id}`);
