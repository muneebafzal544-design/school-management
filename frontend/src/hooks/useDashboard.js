import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFullDashboard, getDashboardStats } from '../api/dashboard';

export const DASHBOARD_KEY = ['dashboard', 'full'];
export const STATS_KEY     = ['dashboard', 'stats'];

/**
 * Full admin dashboard — KPI data + list data in a single request.
 * staleTime: 5 min (backend Redis cache is also 3 min, so this is fine).
 * The AbortController signal is forwarded to axios automatically via React Query.
 */
export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn:  ({ signal }) => getFullDashboard({ signal }).then(r => r.data?.data ?? r.data),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Live KPI-only stats (used for the "Refresh live data" button).
 * Separate key so the full data and the live refresh don't stomp each other.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn:  ({ signal }) => getDashboardStats({ signal }).then(r => r.data?.data ?? r.data),
    staleTime:            2 * 60 * 1000, // 2 min — more aggressive refresh
    refetchOnWindowFocus: true,
  });
}

/**
 * Imperative helper — call this to manually invalidate and refetch
 * both caches (e.g. after bulk operation that changes student counts).
 */
export function useInvalidateDashboard() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}
