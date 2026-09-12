import api from './axios';

export const getInventoryItems   = (params) => api.get('/inventory', { params });
export const getInventorySummary = ()        => api.get('/inventory/summary');
export const createInventoryItem = (data)    => api.post('/inventory', data);
export const updateInventoryItem = (id, data)=> api.put(`/inventory/${id}`, data);
export const deleteInventoryItem = (id)      => api.delete(`/inventory/${id}`);

// Import / Export
export const getInventoryImportTemplate = () =>
  api.get('/inventory/import/template', { responseType: 'blob' });

export const importInventory = (formData) =>
  api.post('/inventory/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const exportInventory = (params = {}) =>
  api.get('/inventory/export', { params, responseType: 'blob' });

export const getLowStockItems = () => api.get('/inventory/low-stock');
