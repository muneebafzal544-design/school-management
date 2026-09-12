import api from './axios';
export const getParentFeed = (params = {}) => api.get('/parent-feed', { params });
export const getMyChildren = ()            => api.get('/parent-feed/children');
