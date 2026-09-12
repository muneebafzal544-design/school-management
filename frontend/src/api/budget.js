import api from './axios';

export const getPlans    = ()           => api.get('/budget');
export const getPlan     = (id)         => api.get(`/budget/${id}`);
export const getSummary  = ()           => api.get('/budget/summary');
export const createPlan  = (data)       => api.post('/budget', data);
export const updatePlan  = (id, data)   => api.put(`/budget/${id}`, data);
export const approvePlan = (id)         => api.post(`/budget/${id}/approve`);
export const deletePlan  = (id)         => api.delete(`/budget/${id}`);

export const createItem  = (planId, data)          => api.post(`/budget/${planId}/items`, data);
export const updateItem  = (planId, itemId, data)  => api.put(`/budget/${planId}/items/${itemId}`, data);
export const deleteItem  = (planId, itemId)        => api.delete(`/budget/${planId}/items/${itemId}`);
