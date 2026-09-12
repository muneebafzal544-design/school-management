import api from './axios';

export const getStudentPlan  = (studentId)     => api.get(`/study-planner/student/${studentId}`);
export const getClassPlan    = (classId)        => api.get(`/study-planner/class/${classId}`);
export const assignTopic     = (data)           => api.post('/study-planner', data);
export const updateTopic     = (id, data)       => api.patch(`/study-planner/${id}`, data);
export const completeTopic   = (id, done = true) => api.patch(`/study-planner/${id}/complete`, { is_completed: done });
export const deleteTopic     = (id)             => api.delete(`/study-planner/${id}`);
