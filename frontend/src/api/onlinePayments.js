import api from './axios';

export const initiatePayment = (data) =>
  api.post('/online-payments/initiate', data);

export const getPaymentStatus = (txnRef) =>
  api.get(`/online-payments/status/${txnRef}`);

export const listPayments = (params = {}) =>
  api.get('/online-payments', { params });
