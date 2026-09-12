import api from './axios';

export const getClassAnalytics    = (classId)       => api.get(`/analytics/class/${classId}`);
export const getTeacherMetrics    = (teacherId)     => api.get(`/analytics/teacher/${teacherId}`);
export const getFinancialAnalytics= (year)          => api.get('/analytics/financial', { params: { year } });
export const getAnnualReport      = (year)          => api.get('/analytics/annual',    { params: { year } });
export const getCustomReport      = (body)          => api.post('/analytics/custom-report', body);
