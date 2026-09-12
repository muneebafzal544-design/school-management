import api from './axios';

// Categories
export const getIncomeCategories  = (params = {}) => api.get('/income/categories',         { params });
export const createIncomeCategory = (data)        => api.post('/income/categories',        data);
export const updateIncomeCategory = (id, data)    => api.put(`/income/categories/${id}`,   data);

// Reports
export const getIncomeSummary     = ()            => api.get('/income/reports/summary');
export const getIncomeMonthly     = (params = {}) => api.get('/income/reports/monthly',    { params });

// CRUD
export const getIncomes           = (params = {}) => api.get('/income',          { params });
export const getIncomeById        = (id)          => api.get(`/income/${id}`);
export const createIncome         = (data)        => api.post('/income',         data);
export const updateIncome         = (id, data)    => api.put(`/income/${id}`,    data);
export const deleteIncome         = (id)          => api.delete(`/income/${id}`);
