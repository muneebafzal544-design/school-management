import api from './api';

export const createWorkflow        = (data)        => api.post('/approvals', data);
export const getWorkflows          = (params)      => api.get('/approvals', { params });
export const getMyApprovals        = ()            => api.get('/approvals/my');
export const respondWorkflow       = (id, data)    => api.put(`/approvals/${id}/respond`, data);
export const cancelBatch           = (batchRef)    => api.delete(`/approvals/batch/${batchRef}`);
export const getBatchSummary       = (batchRef)    => api.get(`/approvals/batch/${batchRef}/summary`);
