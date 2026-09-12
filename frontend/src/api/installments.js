import api from './axios';

export const getInstallments      = (params = {}) => api.get('/installments', { params });
export const getUpcoming          = (days = 7)    => api.get('/installments/upcoming', { params: { days } });
export const getOverdue           = ()             => api.get('/installments/overdue');
export const createInstallmentPlan = (data)        => api.post('/installments/create', data);
export const payInstallment       = (id, data)     => api.post(`/installments/${id}/pay`, data);
export const deleteInstallmentPlan = (invoiceId)   => api.delete(`/installments/invoice/${invoiceId}`);
