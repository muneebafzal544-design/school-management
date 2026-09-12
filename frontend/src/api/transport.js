import api from './axios';

// ── Summary ───────────────────────────────────────────────────────────────────
export const getTransportSummary         = (p = {}) => api.get('/transport/summary',                    { params: p });
export const getStudentsWithoutTransport = (p = {}) => api.get('/transport/students-without-transport', { params: p });

// ── Vehicles (Buses) ──────────────────────────────────────────────────────────
export const getBuses   = (p = {}) => api.get('/transport/buses',         { params: p });
export const getBusById = (id)     => api.get(`/transport/buses/${id}`);
export const createBus  = (data)   => api.post('/transport/buses',        data);
export const updateBus  = (id, d)  => api.put(`/transport/buses/${id}`,   d);
export const deleteBus  = (id)     => api.delete(`/transport/buses/${id}`);

// ── Drivers ───────────────────────────────────────────────────────────────────
export const getDrivers    = (p = {}) => api.get('/transport/drivers',       { params: p });
export const getDriverById = (id)     => api.get(`/transport/drivers/${id}`);
// createDriver and updateDriver send FormData (multipart) to support photo upload
export const createDriver  = (data)   => api.post('/transport/drivers',      data, {
  headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
});
export const updateDriver  = (id, d)  => api.put(`/transport/drivers/${id}`, d, {
  headers: d instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
});
export const deleteDriver  = (id)     => api.delete(`/transport/drivers/${id}`);

// ── Routes ────────────────────────────────────────────────────────────────────
export const getRoutes    = (p = {}) => api.get('/transport/routes',         { params: p });
export const getRouteById = (id)     => api.get(`/transport/routes/${id}`);
export const createRoute  = (data)   => api.post('/transport/routes',        data);
export const updateRoute  = (id, d)  => api.put(`/transport/routes/${id}`,   d);
export const deleteRoute  = (id)     => api.delete(`/transport/routes/${id}`);

// ── Stops ─────────────────────────────────────────────────────────────────────
export const getStops  = (routeId)      => api.get(`/transport/routes/${routeId}/stops`);
export const addStop   = (routeId, d)   => api.post(`/transport/routes/${routeId}/stops`, d);
export const updateStop = (id, d)       => api.put(`/transport/stops/${id}`,   d);
export const deleteStop = (id)          => api.delete(`/transport/stops/${id}`);

// ── Assignments ───────────────────────────────────────────────────────────────
export const getAssignments   = (p = {}) => api.get('/transport/assignments',         { params: p });
export const createAssignment = (data)   => api.post('/transport/assignments',        data);
export const updateAssignment = (id, d)  => api.put(`/transport/assignments/${id}`,   d);
export const deleteAssignment = (id)     => api.delete(`/transport/assignments/${id}`);

// Transfer student to a different bus/route (with history log)
export const transferStudent  = (id, d)  => api.post(`/transport/assignments/${id}/transfer`, d);

// Transfer history for a student
export const getTransferHistory = (studentId) => api.get(`/transport/students/${studentId}/transfer-history`);

// Download PDF transport slip
export const downloadTransportSlip = (assignmentId) =>
  api.get(`/transport/assignments/${assignmentId}/pdf`, { responseType: 'blob' });
