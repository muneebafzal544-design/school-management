import api from './axios';

export const getHealth = () =>
  api.get('/health');

export const getHealthReady = () =>
  api.get('/health/ready');

export const getMetrics = () =>
  api.get('/system-health/metrics');

export const getSystemInfo = () =>
  api.get('/system-health/info');
