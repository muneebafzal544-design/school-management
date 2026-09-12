import api from './axios';

export const login          = (data) => api.post('/auth/login',           data);
export const login2FA       = (data) => api.post('/auth/login/2fa',       data);
export const logout         = (data) => api.post('/auth/logout',           data);
export const refreshToken   = (data) => api.post('/auth/refresh',          data);
export const getMe          = ()     => api.get('/auth/me');
export const changePassword = (data) => api.put('/auth/change-password',   data);
export const getSessions    = ()     => api.get('/auth/sessions');
export const revokeSession  = (id)   => api.delete(`/auth/sessions/${id}`);

// 2FA management
export const get2FASetup    = ()     => api.get('/auth/2fa/setup');
export const enable2FA      = (data) => api.post('/auth/2fa/enable',      data);
export const disable2FA     = (data) => api.post('/auth/2fa/disable',     data);

// Resolves a school code to school info — called before login (no JWT needed)
export const resolveSchool  = (code) => api.get('/schools/resolve', { params: { code } });
