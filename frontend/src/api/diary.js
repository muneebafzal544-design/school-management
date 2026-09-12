import api from './axios';

// CRUD
export const getDiaries       = (params = {})      => api.get('/diary', { params });
export const getDiary         = (id)               => api.get(`/diary/${id}`);
export const createDiary      = (formData)         => api.post('/diary', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateDiary      = (id, formData)     => api.put(`/diary/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteDiary      = (id)               => api.delete(`/diary/${id}`);
export const submitDiary      = (id)               => api.post(`/diary/${id}/submit`);

// Class diary
export const getClassDiary    = (classId, date)    => api.get(`/diary/class/${classId}/date/${date}`);
export const publishDiary     = (classId, date, data) => api.post(`/diary/class/${classId}/date/${date}/publish`, data);
export const unpublishDiary   = (classId, date)    => api.delete(`/diary/class/${classId}/date/${date}/publish`);

// Week overview
export const getWeekOverview  = (classId, weekStart) => api.get(`/diary/week/${classId}`, { params: { week_start: weekStart } });

// Helpers
export const getInchargeClasses  = (teacherId)     => api.get(`/diary/incharge-classes/${teacherId}`);
export const getTeacherSubjects  = (teacherId)     => api.get(`/diary/teacher-subjects/${teacherId}`);
