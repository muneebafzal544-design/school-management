import api from './axios';

// ── Live state ────────────────────────────────────────────────────────────────
export const getLiveBus        = (busId)         => api.get(`/tracking/live/${busId}`);
export const getAllBusesLive   = ()              => api.get('/tracking/all-buses');
export const getMyBus         = ()              => api.get('/tracking/my-bus');
export const getRouteStops    = (busId)         => api.get(`/tracking/route-stops/${busId}`);
export const getTrackingSummary = ()            => api.get('/tracking/summary');

// ── REST fallback (driver, poor internet) ────────────────────────────────────
export const postLocation      = (data)         => api.post('/tracking/location', data);
export const startTrip         = (data)         => api.post('/tracking/start-trip', data);
export const endTrip           = (data)         => api.post('/tracking/end-trip', data);
export const logEvent          = (data)         => api.post('/tracking/event', data);
export const reportEmergency   = (data)         => api.post('/tracking/emergency', data);

// ── History ───────────────────────────────────────────────────────────────────
export const getLocationHistory = (busId, params = {}) =>
  api.get(`/tracking/history/${busId}`, { params });
export const getTripHistory    = (busId)        => api.get(`/tracking/trips/${busId}`);
export const getTripEvents     = (tripId)       => api.get(`/tracking/events/${tripId}`);
