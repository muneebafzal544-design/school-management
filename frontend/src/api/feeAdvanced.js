import api from './axios';

// ── Late Fee Rules Engine ─────────────────────────────────────────────────────
export const getLateRules          = ()       => api.get('/fees/late-rules');
export const createLateRule        = (data)   => api.post('/fees/late-rules', data);
export const updateLateRule        = (id, d)  => api.put(`/fees/late-rules/${id}`, d);
export const deleteLateRule        = (id)     => api.delete(`/fees/late-rules/${id}`);
export const runLateFeeEngine      = (data)   => api.post('/fees/late-rules/run', data);

// ── Fee Policy ────────────────────────────────────────────────────────────────
export const getFeePolicy          = (year)   => api.get(`/fees/policy/${year}`);
export const upsertFeePolicy       = (year, d)=> api.put(`/fees/policy/${year}`, d);

// ── Student Ledger ────────────────────────────────────────────────────────────
export const getStudentLedger      = (sid, p) => api.get(`/fees/ledger/${sid}`, { params: p });

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getRevenueTrend       = (p)      => api.get('/fees/analytics/revenue-trend', { params: p });
export const getClassComparison    = (p)      => api.get('/fees/analytics/class-comparison', { params: p });
export const getCollectionRate     = ()       => api.get('/fees/analytics/collection-rate');
export const getForecast           = (p)      => api.get('/fees/analytics/forecast', { params: p });
export const getDefaulterHeatmap   = (p)      => api.get('/fees/analytics/defaulter-heatmap', { params: p });

// ── Adjustments (Waiver / Refund / Correction) ───────────────────────────────
export const getAdjustments        = (p)      => api.get('/fees/adjustments', { params: p });
export const createAdjustment      = (data)   => api.post('/fees/adjustments', data);
export const approveAdjustment     = (id, d)  => api.post(`/fees/adjustments/${id}/approve`, d);
export const rejectAdjustment      = (id, d)  => api.post(`/fees/adjustments/${id}/reject`, d);

// ── Defaulter Workflow ────────────────────────────────────────────────────────
export const getDefaultersList     = (p)      => api.get('/fees/defaulters/list', { params: p });
export const getDefaulterActions   = (p)      => api.get('/fees/defaulters/actions', { params: p });
export const addDefaulterAction    = (data)   => api.post('/fees/defaulters/actions', data);

// ── Collector Report ──────────────────────────────────────────────────────────
export const getCollectorReport    = (p)      => api.get('/fees/reports/collector', { params: p });

// ── Annual Rollover ───────────────────────────────────────────────────────────
export const rolloverFeeStructures = (data)   => api.post('/fees/rollover', data);

// ── Collection Targets ────────────────────────────────────────────────────────
export const getCollectionTargets  = (p)      => api.get('/fees/targets', { params: p });
export const setCollectionTarget   = (data)   => api.post('/fees/targets', data);
export const deleteCollectionTarget= (id)     => api.delete(`/fees/targets/${id}`);

// ── Public QR Verification ────────────────────────────────────────────────────
export const verifyReceipt         = (no)     => api.get(`/fees/verify-receipt/${no}`);
