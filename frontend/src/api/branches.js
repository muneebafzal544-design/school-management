import api from './axios';

export const getBranches    = ()           => api.get('/branches');
export const getBranch      = (id)         => api.get(`/branches/${id}`);
export const createBranch   = (data)       => api.post('/branches', data);
export const updateBranch   = (id, data)   => api.put(`/branches/${id}`, data);
export const deleteBranch   = (id)         => api.delete(`/branches/${id}`);
export const assignToBranch = (entity, id, branch_id) =>
  api.put(`/branches/${entity}/${id}/branch`, { branch_id });
