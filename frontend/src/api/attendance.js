import api from './axios';

// Fetch for marking
export const getClassStudentsAttendance = (classId, date, periodId) =>
  api.get('/attendance/class-students', { params: { class_id: classId, date, period_id: periodId || undefined } });

export const getTeachersAttendance = (date) =>
  api.get('/attendance/teachers-status', { params: { date } });

// Mark
export const bulkMark  = (records)     => api.post('/attendance/bulk', { records });
export const markSingle = (data)       => api.post('/attendance', data);

// Edit / Delete
export const updateAttendance = (id, data) => api.put(`/attendance/${id}`, data);
export const deleteAttendance = (id)       => api.delete(`/attendance/${id}`);

// Reports
export const getMonthlySummary = (params) => api.get('/attendance/monthly',       { params });
export const getDailySummary   = (params) => api.get('/attendance/daily-summary', { params });

// Export — returns blob via authenticated axios request
export const getExportURL = (params) =>
  api.get('/attendance/export', { params, responseType: 'blob' });

// History
export const getStudentHistory = (studentId, month) =>
  api.get(`/attendance/student/${studentId}/history`, { params: { month } });

// Printable monthly register
export const getAttendanceRegister = (classId, month) =>
  api.get('/attendance/register', { params: { class_id: classId, month } });

// One-tap attendance: teacher's classes for today with pre-populated student list
export const getTeacherQuickList = (teacherId, date) =>
  api.get('/attendance/teacher-quick-list', { params: { teacher_id: teacherId, date } });

// Consecutive absence streaks — students absent >= min_days in a row
export const getAbsenceStreaks = (params) =>
  api.get('/attendance/absence-streaks', { params });

// QR code scan — marks a student present
export const qrScanAttendance = (data) =>
  api.post('/attendance/qr-scan', data);
