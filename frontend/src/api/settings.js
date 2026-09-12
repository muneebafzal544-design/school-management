import api from './axios';

export const getSettings         = ()       => api.get('/settings');
export const saveSettings        = (data)   => api.put('/settings', data);
export const getAcademicYears    = ()       => api.get('/settings/academic-years');
export const createAcademicYear  = (data)   => api.post('/settings/academic-years', data);
export const setActiveYear       = (id)     => api.patch(`/settings/academic-years/${id}/activate`);
export const deleteAcademicYear  = (id)     => api.delete(`/settings/academic-years/${id}`);

export const uploadLogo = (file) => {
  const fd = new FormData();
  fd.append('logo', file);
  return api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const deleteLogo = () => api.delete('/settings/logo');

// Webhooks
export const getWebhooks    = ()         => api.get('/settings/webhooks');
export const createWebhook  = (data)     => api.post('/settings/webhooks', data);
export const updateWebhook  = (id, data) => api.put(`/settings/webhooks/${id}`, data);
export const deleteWebhook  = (id)       => api.delete(`/settings/webhooks/${id}`);
export const testWebhook    = (id)       => api.post(`/settings/webhooks/${id}/test`);
export const getWebhookLogs = (id)       => api.get(`/settings/webhooks/${id}/logs`);
