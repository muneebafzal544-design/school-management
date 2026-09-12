import api from './axios';
export const getSubmissions    = (hwId)        => api.get(`/homework-submissions/${hwId}/submissions`);
export const upsertSubmission  = (hwId, data)  => api.post(`/homework-submissions/${hwId}/submissions`, data);
export const initSubmissions   = (hwId)        => api.post(`/homework-submissions/${hwId}/submissions/init`);
export const checkSubmission   = (hwId, sId, data) => api.put(`/homework-submissions/${hwId}/submissions/${sId}/check`, data);
export const getPendingSummary  = ()            => api.get('/homework-submissions/pending-summary');
export const getStudentHistory  = (studentId)  => api.get(`/homework-submissions/student/${studentId}/history`);
export const getSubmissionStats = (params = {}) => api.get('/homework-submissions/stats', { params });
export const sendReminder       = (hwId)        => api.post(`/homework-submissions/${hwId}/remind`);
