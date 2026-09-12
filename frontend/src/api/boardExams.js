import api from './axios';

export const getBoardExams       = (params = {}) => api.get('/board-exams', { params });
export const getBoardExam        = (id)           => api.get(`/board-exams/${id}`);
export const createBoardExam     = (data)          => api.post('/board-exams', data);
export const updateBoardExam     = (id, data)      => api.put(`/board-exams/${id}`, data);
export const deleteBoardExam     = (id)            => api.delete(`/board-exams/${id}`);
export const getBoardExamStats   = (params = {})   => api.get('/board-exams/stats', { params });
