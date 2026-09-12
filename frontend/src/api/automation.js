import api from './axios';

export const getAttendanceInsights    = (params) => api.get('/automation/attendance-insights', { params });
export const runAttendanceCheck       = ()        => api.post('/automation/attendance-insights/run');
export const runFeeGeneration         = (data)    => api.post('/automation/fee-generation/run', data);
export const runFeeReminders          = ()        => api.post('/automation/fee-reminders/run');
export const runFeeDefaulterReport    = ()        => api.post('/automation/fee-defaulter-report/run');
