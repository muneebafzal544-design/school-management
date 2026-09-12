import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClasses }  from '../api/classes';
import { getSubjects } from '../api/subjects';
import { getSettings } from '../api/settings';
import { getStudents } from '../api/students';

/**
 * Shared cache for rarely-changing reference data (classes, subjects, settings)
 * and the "full student list" used by picker/dropdown UIs across the app.
 *
 * Before this hook existed, ~50 pages independently fetched the same data via
 * their own `useEffect` + axios call on every mount — no dedup, no cache
 * between navigations. React Query dedupes concurrent requests for the same
 * key and serves cached data instantly on remount, cutting a large share of
 * repeat API calls (and the DB round trips behind them) for data that barely
 * ever changes within a session.
 *
 * staleTime is intentionally short (2 min) rather than the usual 5-10 min for
 * static data: the pages that actually create/edit/delete classes, subjects,
 * or settings (ClassesPage, SubjectsPage, SettingsPage) still manage their own
 * local state and don't invalidate these shared keys, so a short staleTime
 * bounds how long any other page's cached dropdown can lag behind a change.
 */
const REF_STALE_TIME = 2 * 60 * 1000;

export function useClasses(params = {}) {
  return useQuery({
    queryKey: ['ref', 'classes', params],
    queryFn:  () => getClasses(params).then(r => r.data?.data ?? r.data ?? []),
    staleTime: REF_STALE_TIME,
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: ['ref', 'subjects'],
    queryFn:  () => getSubjects().then(r => r.data?.data ?? r.data ?? []),
    staleTime: REF_STALE_TIME,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['ref', 'settings'],
    queryFn:  () => getSettings().then(r => r.data?.data ?? r.data ?? {}),
    staleTime: REF_STALE_TIME,
  });
}

/**
 * Full-ish active student list for picker/dropdown UIs (Library, Fees,
 * Gradebook, Alumni, BoardExams, Canteen, Documents, LateArrivals, ...).
 * Not for the paginated Students table itself — that page manages its own
 * server-side pagination/search and should keep fetching directly.
 */
export function useStudentsPicker(params = {}) {
  const merged = { limit: 500, status: 'active', ...params };
  return useQuery({
    queryKey: ['ref', 'studentsPicker', merged],
    queryFn:  () => getStudents(merged).then(r => r.data?.data ?? r.data ?? []),
    staleTime: REF_STALE_TIME,
  });
}

/** Imperative helper — call after any class/subject/settings mutation. */
export function useInvalidateReferenceData() {
  const qc = useQueryClient();
  return (key) => qc.invalidateQueries({ queryKey: key ? ['ref', key] : ['ref'] });
}
