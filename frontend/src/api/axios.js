import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://school-management-backend-taupe.vercel.app/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token storage helpers (backward-compatible with old 'token' key) ─
export const tokenStorage = {
  getAccess:      () => localStorage.getItem('accessToken') || localStorage.getItem('token'),
  getRefresh:     () => localStorage.getItem('refreshToken'),
  setAccess:  (t) => { localStorage.setItem('accessToken', t); localStorage.removeItem('token'); },
  setRefresh: (t) => localStorage.setItem('refreshToken', t),
  clear:      ()  => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// ── Silent refresh — coalesces parallel 401s into a single call ───
let refreshPromise = null;

async function silentRefresh() {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new Error('No refresh token stored.');

  // Use plain axios (not `api`) to avoid interceptor loops
  const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });  // BASE_URL already includes /api/v1
  const newToken  = data?.data?.accessToken ?? data?.accessToken;
  if (!newToken) throw new Error('Refresh response missing accessToken.');

  tokenStorage.setAccess(newToken);
  return newToken;
}

// ── Request interceptor: attach access token ──────────────────────
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccess();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: unwrap arrays + handle 401 ─────────────
api.interceptors.response.use(
  (response) => {
    // Unwrap { success: true, data: [...] } so callers get the array directly
    const d = response.data;
    if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.data)) {
      // Preserve pagination metadata before overwriting response.data
      response.total  = d.total;
      response.limit  = d.limit;
      response.offset = d.offset;
      response.data = d.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const code   = error.response?.data?.code;

    // Silently refresh on TOKEN_EXPIRED — try once per request
    if (status === 401 && code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = silentRefresh().finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest); // replay original request with new token
      } catch {
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Temp password not yet changed — redirect to change-password screen
    if (status === 403 && code === 'PASSWORD_CHANGE_REQUIRED') {
      window.location.href = '/change-password';
      return Promise.reject(error);
    }

    // Hard 401 → only redirect if we actually had a token (session expired/invalid)
    // If code is NO_TOKEN there was nothing to expire — just reject quietly
    if (status === 401 && !originalRequest._retry && code !== 'NO_TOKEN') {
      tokenStorage.clear();
      window.location.href = '/login';
    }

    error.displayMessage =
      error.response?.data?.message ||
      error.response?.data?.error   ||
      error.message                 ||
      'Something went wrong.';

    return Promise.reject(error);
  }
);

export default api;
