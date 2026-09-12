import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, login2FA as apiLogin2FA, logout as apiLogout, getMe } from '../api/auth';
import { tokenStorage } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(true);

  /**
   * Re-validate the stored user against the backend on every page load/refresh.
   * This ensures stale role/permission data is corrected without requiring re-login.
   * Only runs when we actually have an access token.
   */
  const revalidateUser = useCallback(async () => {
    const token = tokenStorage.getAccess();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    try {
      const res  = await getMe();
      // /auth/me returns { success, data: { ...jwtPayload } } — not unwrapped (object, not array)
      const fresh = res.data?.data ?? res.data;
      if (fresh?.id) {
        setUser(fresh);
        localStorage.setItem('user', JSON.stringify(fresh));
      }
    } catch {
      // Token invalid/expired — clear state; silent refresh is handled by axios interceptor
      // Don't call signOut() here to avoid infinite loops; just clear local state
      tokenStorage.clear();
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    revalidateUser();
  }, [revalidateUser]);

  /**
   * Sign in — supports both single-tenant and multi-tenant modes.
   *
   * Single-tenant (existing):  signIn(username, password)
   * Multi-tenant (new):        signIn(username, password, school_code)
   */
  const signIn = async (username, password, school_code = null) => {
    const body = { username, password };
    if (school_code) body.school_code = school_code;

    const res = await apiLogin(body);
    const payload = res.data?.data ?? res.data;

    // 2FA required — return sentinel so LoginPage can show TOTP step
    if (payload.requires_2fa) {
      return { requires_2fa: true, temp_token: payload.temp_token };
    }

    const { accessToken, refreshToken, user: u } = payload;
    tokenStorage.setAccess(accessToken);
    tokenStorage.setRefresh(refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const verify2FALogin = async (temp_token, totp_code) => {
    const res = await apiLogin2FA({ temp_token, totp_code });
    const payload = res.data?.data ?? res.data;
    const { accessToken, refreshToken, user: u } = payload;
    tokenStorage.setAccess(accessToken);
    tokenStorage.setRefresh(refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  /**
   * Sign out — revokes the refresh token server-side, then clears local state.
   */
  const signOut = async () => {
    try {
      await apiLogout({ refreshToken: tokenStorage.getRefresh() });
    } catch {
      // Ignore — server may have already revoked the token
    } finally {
      tokenStorage.clear();
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  /**
   * Update the local user state + localStorage when profile data changes
   * (e.g. name change, avatar update) without requiring a full re-login.
   */
  const updateUser = (patch) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, signIn, verify2FALogin, signOut, updateUser, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
