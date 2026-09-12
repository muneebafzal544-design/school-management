import api from './axios';

// ── Salary Structures ────────────────────────────────────────
export const getSalaryStructures        = ()           => api.get('/salary/structures');
export const getTeacherSalaryStructure  = (teacherId)  => api.get(`/salary/structures/${teacherId}`);
export const upsertSalaryStructure      = (data)       => api.post('/salary/structures', data);

// ── Salary Payments ──────────────────────────────────────────
export const getSalaryPayments     = (params = {}) => api.get('/salary/payments', { params });
export const generateMonthlySalaries = (month)    => api.post('/salary/payments/generate', { month });
export const getSalarySlip         = (id)         => api.get(`/salary/payments/${id}`);
export const updateSalaryPayment   = (id, data)   => api.put(`/salary/payments/${id}`, data);
export const markSalaryPaid        = (id, data)   => api.post(`/salary/payments/${id}/mark-paid`, data);
export const bulkMarkSalaryPaid    = (data)        => api.post('/salary/payments/bulk-mark-paid', data);

// ── Salary Policy ─────────────────────────────────────────────
export const getSalaryPolicy    = ()     => api.get('/salary/policy');
export const updateSalaryPolicy = (data) => api.put('/salary/policy', data);

// ── Exports ───────────────────────────────────────────────────
export const exportBankTransferCSV = (month) =>
  api.get('/salary/bank-export', { params: month ? { month } : {}, responseType: 'blob' });
export const getMySlips          = ()           => api.get('/salary/payments/my');
export const getTaxPreview        = (params={}) => api.get('/salary/tax-preview', { params });
export const listAdvances         = (params={}) => api.get('/salary/advances', { params });
export const requestAdvance       = (data)      => api.post('/salary/advances', data);
export const approveAdvance       = (id)        => api.patch(`/salary/advances/${id}/approve`);
export const rejectAdvance        = (id)        => api.patch(`/salary/advances/${id}/reject`);
