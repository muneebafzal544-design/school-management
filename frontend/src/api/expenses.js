import api from './axios';

// ── Categories ─────────────────────────────────────────────
export const getCategories   = (params = {}) => api.get('/expenses/categories',         { params });
export const createCategory  = (data)        => api.post('/expenses/categories',        data);
export const updateCategory  = (id, data)    => api.put(`/expenses/categories/${id}`,   data);

// ── Reports ────────────────────────────────────────────────
export const getExpenseSummary      = ()           => api.get('/expenses/reports/summary');
export const getMonthlyReport       = (params = {})=> api.get('/expenses/reports/monthly',      { params });
export const getYearlyReport        = ()           => api.get('/expenses/reports/yearly');
export const getByCategoryReport    = (params = {})=> api.get('/expenses/reports/by-category',  { params });

// ── Expenses CRUD ──────────────────────────────────────────
export const getExpenses     = (params = {}) => api.get('/expenses',          { params });
export const getExpenseById  = (id)          => api.get(`/expenses/${id}`);
export const createExpense   = (data)        => api.post('/expenses',         data);
export const updateExpense   = (id, data)    => api.put(`/expenses/${id}`,    data);
export const deleteExpense   = (id)          => api.delete(`/expenses/${id}`);

// Import / Export
export const getExpenseImportTemplate = () =>
  api.get('/expenses/import/template', { responseType: 'blob' });

export const importExpenses = (formData) =>
  api.post('/expenses/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const exportExpenses = (params = {}) =>
  api.get('/expenses/export', { params, responseType: 'blob' });
