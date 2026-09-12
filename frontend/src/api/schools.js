import api from './axios';

export const getSchoolStats   = ()        => api.get('/schools/stats');
export const listSchools      = ()        => api.get('/schools');
export const createSchool     = (data)    => api.post('/schools', data);
export const updateSchool     = (id, d)   => api.patch(`/schools/${id}`, d);
export const resetSchoolAdmin = (id, d)   => api.post(`/schools/${id}/reset-admin`, d);
export const resolveSchool    = (code)    => api.get('/schools/resolve', { params: { code } });
