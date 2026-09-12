import api from './axios';

// Fee heads
export const getFeeHeads    = (p)     => api.get('/fees/heads', { params: p });
export const createFeeHead  = (d)     => api.post('/fees/heads', d);
export const updateFeeHead  = (id, d) => api.put(`/fees/heads/${id}`, d);
export const deleteFeeHead  = (id)    => api.delete(`/fees/heads/${id}`);

// Fee structures
export const getFeeStructures    = (p)     => api.get('/fees/structures', { params: p });
export const upsertFeeStructure  = (d)     => api.post('/fees/structures', d);
export const deleteFeeStructure  = (id)    => api.delete(`/fees/structures/${id}`);

// Invoices
export const getInvoices              = (p)         => api.get('/fees/invoices', { params: p });
export const getInvoice               = (id)        => api.get(`/fees/invoices/${id}`);
export const createInvoice            = (d)         => api.post('/fees/invoices', d);
export const generateMonthlyFees      = (d)         => api.post('/fees/invoices/generate-monthly', d);
export const generateAdmissionInvoice = (sid, d)    => api.post(`/fees/invoices/generate-admission/${sid}`, d);
export const updateInvoice            = (id, d)     => api.put(`/fees/invoices/${id}`, d);
export const cancelInvoice            = (id)        => api.delete(`/fees/invoices/${id}`);

// Payments
export const recordPayment      = (d)     => api.post('/fees/payments', d);
export const bulkRecordPayments = (d)     => api.post('/fees/payments/bulk', d);
export const getPayments        = (p)     => api.get('/fees/payments', { params: p });
export const voidPayment        = (id, d) => api.delete(`/fees/payments/${id}`, { data: d });

// Reports
export const getMonthlySummary      = (p)  => api.get('/fees/reports/monthly-summary', { params: p });
export const getOutstandingBalances = (p)  => api.get('/fees/reports/outstanding', { params: p });
export const getStudentFeeHistory   = (id) => api.get(`/fees/reports/student/${id}`);
export const getDashboardStats      = ()   => api.get('/fees/dashboard-stats');

export const getExportURL = (params = {}) =>
  api.get('/fees/export', { params, responseType: 'blob' });

// Print data
export const getInvoicePrint   = (id)        => api.get(`/fees/invoices/${id}/print`);
export const getChallanPrint   = (id)        => api.get(`/fees/invoices/${id}/challan`);
export const getReceiptPrint   = (id)        => api.get(`/fees/payments/${id}/receipt`);
export const getBulkPrintData  = (p = {})    => api.get('/fees/bulk-print', { params: p });

// New reports
export const getByClassReport = (p = {}) => api.get('/fees/reports/by-class', { params: p });
export const getDailyReport   = (p = {}) => api.get('/fees/reports/daily',    { params: p });

// Concessions
export const getConcessions        = (p = {}) => api.get('/fees/concessions',             { params: p });
export const saveConcession        = (d)      => api.post('/fees/concessions',             d);
export const deleteConcession      = (id)     => api.delete(`/fees/concessions/${id}`);
export const applyScholarshipTier  = (d)      => api.post('/fees/concessions/apply-tier', d);

// Late fees
export const applyLateFees = (d) => api.post('/fees/invoices/apply-late-fees', d);

// Payment import
export const getFeePaymentImportTemplate = () =>
  api.get('/fees/payments/import/template', { responseType: 'blob' });

export const importFeePayments = (formData) =>
  api.post('/fees/payments/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const exportFeesExcel = (params = {}) =>
  api.get('/fees/export', { params: { ...params, format: 'xlsx' }, responseType: 'blob' });

// Fee reminders (email + SMS broadcast)
export const sendFeeReminders = (data = {}) => api.post('/fees/send-reminders', data);

// Student fee account (full ledger — student info + invoices + payments + concessions)
export const getStudentFeeAccount = (id) => api.get(`/fees/reports/student/${id}`);

// Sibling vouchers
export const getSiblingGroups  = (billing_month) => api.get('/fees/sibling-groups',  { params: { billing_month } });
export const getSiblingVoucher = (billing_month, father_cnic) => api.get('/fees/sibling-voucher', { params: { billing_month, father_cnic } });

// Class-wise fee collection report
export const getClassFeeCollection = (billing_month) => api.get('/fees/reports/class-collection', { params: { billing_month } });

// Bulk class concession
export const bulkClassConcession = (data) => api.post('/fees/concessions/bulk-class', data);

// Installment plans
export const getInstallments        = (invoiceId)        => api.get(`/fees/invoices/${invoiceId}/installments`);
export const createInstallmentPlan  = (invoiceId, data)  => api.post(`/fees/invoices/${invoiceId}/installments`, data);
export const deleteInstallmentPlan  = (invoiceId)        => api.delete(`/fees/invoices/${invoiceId}/installments`);
export const payInstallment         = (instId, data)     => api.post(`/fees/installments/${instId}/pay`, data);
