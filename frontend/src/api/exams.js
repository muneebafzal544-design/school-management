import api from './axios';

// ── Exams CRUD ─────────────────────────────────────────────
export const getExams       = (params = {})       => api.get('/exams', { params });
export const getExamById    = (id)                => api.get(`/exams/${id}`);
export const createExam     = (data)              => api.post('/exams', data);
export const updateExam     = (id, data)          => api.put(`/exams/${id}`, data);
export const updateExamStatus = (id, status)      => api.patch(`/exams/${id}/status`, { status });
export const deleteExam     = (id)                => api.delete(`/exams/${id}`);

// ── Exam Subjects (marks config) ───────────────────────────
export const getExamSubjects    = (examId, params = {}) => api.get(`/exams/${examId}/subjects`, { params });
export const addExamSubjects    = (examId, subjects)    => api.post(`/exams/${examId}/subjects`, { subjects });
export const removeExamSubject  = (id)                  => api.delete(`/exams/subjects/${id}`);

// ── Student Marks ──────────────────────────────────────────
export const getMarks    = (examId, params = {}) => api.get(`/exams/${examId}/marks`, { params });
export const submitMarks = (examId, marks)       => api.post(`/exams/${examId}/marks`, { marks });
export const deleteMark  = (id)                  => api.delete(`/exams/marks/${id}`);

// ── Publish / lock results ─────────────────────────────────
export const publishResults   = (examId) => api.post(`/exams/${examId}/publish-results`);
export const unpublishResults = (examId) => api.delete(`/exams/${examId}/publish-results`);

// ── Results ────────────────────────────────────────────────
export const calculateResults     = (examId)              => api.post(`/exams/${examId}/calculate-results`);
export const getResults           = (examId, params = {}) => api.get(`/exams/${examId}/results`, { params });
export const getStudentReportCard = (examId, studentId)   => api.get(`/exams/${examId}/results/student/${studentId}`);
export const getClassRanking      = (examId, classId)     => api.get(`/exams/${examId}/results/class/${classId}/ranking`);
export const getClassReportCards      = (examId, classId)  => api.get(`/exams/${examId}/results/class/${classId}/report-cards`);

// ── Student Performance (longitudinal) ─────────────────────
export const getStudentPerformance = (studentId) => api.get(`/exams/student/${studentId}/performance`);

// ── PDF Downloads ───────────────────────────────────────────
export const downloadStudentReportCardPDF = (examId, studentId) =>
  api.get(`/exams/${examId}/results/student/${studentId}/pdf`, { responseType: 'blob', timeout: 30000 });

export const downloadClassReportCardsPDF = (examId, classId) =>
  api.get(`/exams/${examId}/results/class/${classId}/report-cards/pdf`, { responseType: 'blob', timeout: 60000 });

// ── Date Sheet ──────────────────────────────────────────────
export const getDateSheet    = (examId, params = {}) => api.get(`/exams/${examId}/date-sheet`, { params });
export const updateDateSheet = (examId, data)        => api.patch(`/exams/${examId}/date-sheet`, data);

// ── Roll Number Slips ────────────────────────────────────────
export const getRollSlips = (examId, params = {}) => api.get(`/exams/${examId}/roll-slips`, { params });
