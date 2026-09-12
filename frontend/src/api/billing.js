import api from './axios';

export const getPlans = () =>
  api.get('/billing/plans');

export const getSubscription = () =>
  api.get('/billing/subscription');

export const getPayments = (params = {}) =>
  api.get('/billing/payments', { params });

export const requestUpgrade = (data) =>
  api.post('/billing/upgrade', data);
