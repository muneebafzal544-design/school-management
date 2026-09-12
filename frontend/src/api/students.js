import api from './axios';

export const getStudents = (params = {}) =>
  api.get('/students', { params });

export const getStudent = (id) =>
  api.get(`/students/${id}`);

export const createStudent = (data) =>
  api.post('/students', data);

export const updateStudent = (id, data) =>
  api.put(`/students/${id}`, data);

export const deleteStudent = (id) =>
  api.delete(`/students/${id}`);

// body: { from_class_id, to_class_id, student_ids? }
export const promoteStudents = (data) =>
  api.post('/students/promote', data);

// Photo upload (FormData with field "photo")
export const uploadStudentPhoto = (id, formData) =>
  api.post(`/students/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Documents
export const getStudentDocuments  = (id)           => api.get(`/students/${id}/documents`);
export const uploadStudentDocument = (id, formData) =>
  api.post(`/students/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteStudentDocument = (studentId, docId) =>
  api.delete(`/students/${studentId}/documents/${docId}`);

// Credentials
export const getStudentCredentials     = (id) => api.get(`/students/${id}/credentials`);
export const resetStudentCredentials   = (id) => api.post(`/students/${id}/reset-credentials`);
export const getParentCredentials      = (id) => api.get(`/students/${id}/parent-credentials`);
export const resetParentCredentials    = (id) => api.post(`/students/${id}/reset-parent-credentials`);

// Import / Export
export const getStudentImportTemplate = () =>
  api.get('/students/import/template', { responseType: 'blob' });

export const importStudents = (formData) =>
  api.post('/students/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const exportStudents = (params = {}) =>
  api.get('/students/export', { params, responseType: 'blob' });

// Soft-delete / restore
export const getDeletedStudents = () => api.get('/students/deleted');
export const restoreStudent     = (id) => api.post(`/students/${id}/restore`);
