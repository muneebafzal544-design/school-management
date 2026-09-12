import api from './axios';

// ── Subjects CRUD ─────────────────────────────────────────────
export const getSubjects = ()           => api.get('/subjects');
export const createSubject = (data)     => api.post('/subjects', data);
export const updateSubject = (id, data) => api.put(`/subjects/${id}`, data);
export const deleteSubject = (id)       => api.delete(`/subjects/${id}`);

// ── Class-Subject assignments ─────────────────────────────────
export const getClassSubjects    = (classId, params = {}) => api.get(`/subjects/class/${classId}`, { params });
export const assignSubjectToClass = (classId, data)       => api.post(`/subjects/class/${classId}`, data);
export const removeSubjectFromClass = (id)                => api.delete(`/subjects/class-subject/${id}`);

// ── Teacher-Subject assignments ───────────────────────────────
export const assignTeacherToSubject  = (data) => api.post('/subjects/assign-teacher', data);
export const removeTeacherAssignment = (id)   => api.delete(`/subjects/teacher-assignment/${id}`);

// ── Schedule views ────────────────────────────────────────────
export const getClassSchedule  = (classId, params = {}) => api.get(`/subjects/schedule/${classId}`, { params });
export const getAllSchedules    = (params = {})           => api.get('/subjects/all-schedules', { params });
