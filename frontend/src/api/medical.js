import api from './axios';
export const getStudentMedical   = (id)        => api.get(`/medical/student/${id}`);
export const addVaccination      = (id, data)  => api.post(`/medical/student/${id}/vaccinations`, data);
export const deleteVaccination   = (id)        => api.delete(`/medical/vaccinations/${id}`);
export const addMedicalVisit     = (id, data)  => api.post(`/medical/student/${id}/visits`, data);
export const deleteMedicalVisit  = (id)        => api.delete(`/medical/visits/${id}`);
export const getMedicalSummary   = (params)    => api.get('/medical/summary', { params });
