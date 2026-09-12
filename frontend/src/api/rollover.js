import api from './axios';
export const getRolloverPreview   = ()     => api.get('/rollover/preview');
export const bulkPromote          = (data) => api.post('/rollover/promote', data);
export const activateNewYear      = (data) => api.post('/rollover/activate-year', data);
export const getPromotionHistory  = (p)    => api.get('/rollover/history', { params: p });
