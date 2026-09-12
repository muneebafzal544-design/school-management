import api from './axios';

export const getTeachers = (params = {}) =>
  api.get('/teachers', { params });

export const getTeacher = (id) =>
  api.get(`/teachers/${id}`);

export const createTeacher = (data) =>
  api.post('/teachers', data);

export const updateTeacher = (id, data) =>
  api.put(`/teachers/${id}`, data);

export const deleteTeacher = (id) =>
  api.delete(`/teachers/${id}`);

/** Classes assigned to this teacher */
export const getTeacherClasses = (id) =>
  api.get(`/teachers/${id}/classes`);

/** Students taught by this teacher (via their classes) */
export const getTeacherStudents = (id) =>
  api.get(`/teachers/${id}/students`);

export const uploadTeacherPhoto = (id, formData) =>
  api.post(`/teachers/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const getTeacherDocuments = (id) =>
  api.get(`/teachers/${id}/documents`);

export const uploadTeacherDocument = (id, formData) =>
  api.post(`/teachers/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteTeacherDocument = (teacherId, docId) =>
  api.delete(`/teachers/${teacherId}/documents/${docId}`);

// Import / Export
export const getTeacherImportTemplate = () =>
  api.get('/teachers/import/template', { responseType: 'blob' });

export const importTeachers = (formData) =>
  api.post('/teachers/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const exportTeachers = (params = {}) =>
  api.get('/teachers/export', { params, responseType: 'blob' });

// Soft-delete / restore
export const getDeletedTeachers = () => api.get('/teachers/deleted');
export const restoreTeacher     = (id) => api.post(`/teachers/${id}/restore`);

// Credentials
export const getTeacherCredentials   = (id) => api.get(`/teachers/${id}/credentials`);
export const resetTeacherCredentials = (id) => api.post(`/teachers/${id}/reset-credentials`);

// Letter templates
export const getLetterTemplates   = (params = {}) => api.get('/teachers/letter-templates', { params });
export const getLetterTemplate    = (id)           => api.get(`/teachers/letter-templates/${id}`);
export const createLetterTemplate = (data)         => api.post('/teachers/letter-templates', data);
export const updateLetterTemplate = (id, data)     => api.put(`/teachers/letter-templates/${id}`, data);
export const deleteLetterTemplate = (id)           => api.delete(`/teachers/letter-templates/${id}`);

// Document generation
export const generateTeacherDocument = (teacherId, data) =>
  api.post(`/teachers/${teacherId}/generate-document`, data);
