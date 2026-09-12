import api from './axios';

export const getConfig       = ()       => api.get('/website/config');
export const updateConfig    = (data)   => api.put('/website/config', data);
export const togglePublish   = (pub)    => api.post('/website/publish', { published: pub });

export const getSections     = ()       => api.get('/website/sections');
export const createSection   = (data)   => api.post('/website/sections', data);
export const updateSection   = (id, d)  => api.put(`/website/sections/${id}`, d);
export const deleteSection   = (id)     => api.delete(`/website/sections/${id}`);
