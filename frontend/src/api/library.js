import api from './axios';

// Summary
export const getLibrarySummary = ()         => api.get('/library/summary');

// Categories
export const getCategories    = (p = {})    => api.get('/library/categories', { params: p });
export const createCategory   = (d)         => api.post('/library/categories', d);
export const updateCategory   = (id, d)     => api.put(`/library/categories/${id}`, d);
export const deleteCategory   = (id)        => api.delete(`/library/categories/${id}`);

// Books
export const getBooks         = (p = {})    => api.get('/library/books', { params: p });
export const getBook          = (id)        => api.get(`/library/books/${id}`);
export const createBook       = (d)         => api.post('/library/books', d);
export const updateBook       = (id, d)     => api.put(`/library/books/${id}`, d);
export const deleteBook       = (id)        => api.delete(`/library/books/${id}`);

// Copies
export const getCopies        = (bookId)    => api.get(`/library/books/${bookId}/copies`);
export const addCopy          = (bookId, d) => api.post(`/library/books/${bookId}/copies`, d);
export const updateCopy       = (id, d)     => api.put(`/library/copies/${id}`, d);
export const deleteCopy       = (id)        => api.delete(`/library/copies/${id}`);

// Issues
export const getIssues        = (p = {})    => api.get('/library/issues', { params: p });
export const issueBook        = (d)         => api.post('/library/issues', d);
export const returnBook       = (id, d)     => api.put(`/library/issues/${id}/return`, d);

// Fines
export const getFines         = (p = {})    => api.get('/library/fines', { params: p });
export const markFinePaid     = (id, d)     => api.put(`/library/fines/${id}/pay`, d);

// Reports
export const getMostBorrowed      = (p = {}) => api.get('/library/reports/most-borrowed', { params: p });
export const getBorrowingHistory  = (p = {}) => api.get('/library/reports/borrowing-history', { params: p });

// Borrower search
export const searchBorrowers = (q) => api.get('/library/borrowers/search', { params: { q } });

// Reservations
export const getReservations    = (p = {})  => api.get('/library/reservations', { params: p });
export const createReservation  = (d)       => api.post('/library/reservations', d);
export const cancelReservation  = (id)      => api.patch(`/library/reservations/${id}/cancel`);
export const fulfillReservation = (id)      => api.patch(`/library/reservations/${id}/fulfill`);
