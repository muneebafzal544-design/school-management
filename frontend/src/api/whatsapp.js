import api from './axios';

export const sendWhatsApp = (data) =>
  api.post('/whatsapp/send', data);

export const sendBulkWhatsApp = (data) =>
  api.post('/whatsapp/bulk', data);

export const getWhatsAppLogs = (params = {}) =>
  api.get('/whatsapp/logs', { params });

export const getWhatsAppStats = () =>
  api.get('/whatsapp/stats');
