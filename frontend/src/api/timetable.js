import api from './axios';

// Periods
export const getPeriods        = ()         => api.get('/timetable/periods');
export const createPeriod      = (data)     => api.post('/timetable/periods', data);
export const updatePeriod      = (id, data) => api.put(`/timetable/periods/${id}`, data);
export const deletePeriod      = (id)       => api.delete(`/timetable/periods/${id}`);

// Timetable grid
export const getTimetable      = (classId, year) =>
  api.get('/timetable', { params: { class_id: classId, academic_year: year } });

export const upsertEntry       = (data)     => api.post('/timetable/entries', data);
export const deleteEntry       = (id)       => api.delete(`/timetable/entries/${id}`);

// Teacher view
export const getTeacherTimetable = (teacherId, year) =>
  api.get(`/timetable/teacher/${teacherId}`, { params: { academic_year: year } });

// Full school (all classes) — for bulk print/download
export const getFullTimetable = (year) =>
  api.get('/timetable/all', { params: { academic_year: year } });

// Conflict detection — returns double-booked slots for a class
export const getConflicts = (classId, year) =>
  api.get('/timetable/conflicts', { params: { class_id: classId, academic_year: year } });
