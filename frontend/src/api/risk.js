import api from './axios';

export const getStudentRisk = (studentId) =>
  api.get(`/risk/student/${studentId}`);

export const getRiskScores = (params = {}) =>
  api.get('/risk/scores', { params });

export const getRiskSummary = () =>
  api.get('/risk/summary');

export const recalculateRisk = () =>
  api.post('/risk/recalculate');

export const getInterventions    = (studentId)  => api.get(`/risk/interventions/${studentId}`);
export const addIntervention     = (data)        => api.post('/risk/interventions', data);
export const deleteIntervention  = (id)          => api.delete(`/risk/interventions/${id}`);
