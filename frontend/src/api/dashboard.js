import api from './axios';

export const getDashboardStats = ({ signal } = {}) =>
  api.get('/dashboard/stats', { signal });

/** Single endpoint — returns KPI data + lists (students, classes, teachers, exams, online classes, fees).
 *  Replaces 7 parallel calls on the admin dashboard. */
export const getFullDashboard = ({ signal } = {}) =>
  api.get('/dashboard/full', { signal });
