import api from './axios';

export const getStaff            = (params) => api.get('/staff', { params });
export const getStaffById        = (id)     => api.get(`/staff/${id}`);
export const createStaff         = (data)   => api.post('/staff', data);
export const updateStaff         = (id, data) => api.put(`/staff/${id}`, data);
export const deleteStaff         = (id)     => api.delete(`/staff/${id}`);
export const getDepartments      = ()       => api.get('/staff/departments');

export const getStaffAttendance  = (id, params) => api.get(`/staff/${id}/attendance`, { params });
export const bulkStaffAttendance = (data)   => api.post('/staff/attendance/bulk', data);

export const getStaffSalary      = (params) => api.get('/staff/salary/list', { params });
export const generateStaffSalary = (data)   => api.post('/staff/salary/generate', data);
export const updateStaffSalary   = (id, data) => api.put(`/staff/salary/${id}`, data);
