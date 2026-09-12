import { useState, useEffect, useCallback } from 'react';

const PREFIX = 'offline_cache_';

/**
 * A hook that caches API data in localStorage so the app can display
 * stale data when the user goes offline.
 *
 * Usage:
 *   const { data, loading, error, refresh } = useOfflineData('dashboard', () => getDashboardStats());
 */
export function useOfflineData(key, fetchFn, options = {}) {
  const { ttl = 5 * 60 * 1000 } = options; // default 5 min stale TTL
  const storageKey = `${PREFIX}${key}`;

  function readCache() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      return { data, ts, stale: Date.now() - ts > ttl };
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* storage full — silently ignore */ }
  }

  const cached = readCache();
  const [data, setData]       = useState(cached?.data ?? null);
  const [loading, setLoading] = useState(!cached || cached.stale);
  const [error, setError]     = useState(null);
  const [isStale, setIsStale] = useState(!!cached?.stale);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      const payload = result?.data?.data ?? result?.data ?? result;
      setData(payload);
      setIsStale(false);
      writeCache(payload);
    } catch (err) {
      setError(err);
      // Keep stale data visible
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    if (!cached || cached.stale) {
      refresh();
    }
  }, [key]);

  return { data, loading, error, isStale, refresh };
}

export default useOfflineData;
