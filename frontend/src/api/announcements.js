import api from './axios';

// ── Filtered views ─────────────────────────────────────────
export const getActiveAnnouncements = (params = {}) => api.get('/announcements/active',       { params });
export const getForStudents         = (params = {}) => api.get('/announcements/for-students',  { params });
export const getForTeachers         = (params = {}) => api.get('/announcements/for-teachers',  { params });
export const getRecentAnnouncements = (params = {}) => api.get('/announcements/recent',        { params });
export const getAnnouncementHistory = (params = {}) => api.get('/announcements/history',       { params });

// ── CRUD ───────────────────────────────────────────────────
export const getAnnouncements       = (params = {}) => api.get('/announcements',               { params });
export const getAnnouncementById    = (id)          => api.get(`/announcements/${id}`);
export const createAnnouncement     = (data)        => api.post('/announcements', data);
export const updateAnnouncement     = (id, data)    => api.put(`/announcements/${id}`, data);
export const toggleAnnouncement     = (id)          => api.patch(`/announcements/${id}/toggle`);
export const deleteAnnouncement     = (id)          => api.delete(`/announcements/${id}`);

// ── Read tracking ──────────────────────────────────────────
export const markAnnouncementRead   = (id, data)    => api.post(`/announcements/${id}/read`, data);
export const getAnnouncementReads   = (id)          => api.get(`/announcements/${id}/reads`);

// ── Email broadcast ────────────────────────────────────────
export const sendAnnouncementEmail  = (id)          => api.post(`/announcements/${id}/send-email`);
