/**
 * LiveTrackingPage.jsx
 * Parent-facing live vehicle tracking screen.
 * - Loads via /tracking route
 * - Parents see their child's bus on a live map
 * - Shows ETA, trip status, notifications
 * - Gracefully degrades when socket unavailable (polling fallback)
 */

import { useState, useEffect, useCallback } from 'react';
import { lazy, Suspense } from 'react';
import {
  MapPin, Wifi, WifiOff, Clock, AlertTriangle, CheckCircle2,
  RefreshCw, Navigation, Bell, X, Bus, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { getMyBus, getAllBusesLive } from '../api/tracking';

// Lazy-load map (heavy Leaflet bundle — only load when needed)
const TrackingMap = lazy(() => import('../components/TrackingMap'));

// ── Trip status labels ────────────────────────────────────────────────────────
const TRIP_STATUS = {
  idle:    { label: 'Not Started', cls: 'text-gray-500',   bg: 'bg-gray-100 dark:bg-gray-700' },
  started: { label: 'En Route',    cls: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ended:   { label: 'Arrived',     cls: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
};

export default function LiveTrackingPage() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  // Parent: auto-detect bus; Admin: pick from list
  const [busInfo,    setBusInfo]    = useState(null);   // { bus_id, student_name, stop_lat, stop_lng, stop_name, ... }
  const [allBuses,   setAllBuses]   = useState([]);     // for admin view
  const [selectedBus,setSelectedBus]= useState(null);
  const [loading,    setLoading]    = useState(true);
  const [autoPan,    setAutoPan]    = useState(true);
  const [showNotifs, setShowNotifs] = useState(false);

  const activeBusId = selectedBus || busInfo?.bus_id;

  const {
    liveLocation, routeStops, breadcrumb, tripStatus,
    isOnline, notifications, alerts,
    etaMinutes, nearStop,
    connected, socketMode,
    emit, dismissNotification, dismissAlert,
  } = useVehicleTracking(activeBusId, { role: user?.role, token });

  // ── Load initial data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function loadData() {
      setLoading(true);
      try {
        if (isAdmin) {
          const r = await getAllBusesLive();
          // Axios interceptor unwraps {success,data:[...]} → r.data IS the array
          const buses = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
          setAllBuses(buses);
          if (buses.length) setSelectedBus(buses[0].id);
        } else {
          const r = await getMyBus();
          const rows = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
          const firstChild = rows[0];
          if (firstChild) setBusInfo(firstChild);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load bus information');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAdmin, user]);

  // ── Student's own stop (for map highlight) ────────────────────────────────
  const studentStop = busInfo?.stop_lat
    ? { latitude: busInfo.stop_lat, longitude: busInfo.stop_lng, stop_name: busInfo.stop_name }
    : null;

  // ── Notification count badge ───────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <Layout><div className="p-6"><PageLoader /></div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)]">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Bus className="text-blue-600" size={22} />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Live Tracking
              </h1>
              {busInfo && (
                <p className="text-xs text-gray-500">{busInfo.student_name}'s van · {busInfo.route_name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin bus selector */}
            {isAdmin && allBuses.length > 0 && (
              <select value={selectedBus || ''} onChange={e => setSelectedBus(+e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              >
                {allBuses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bus_number} — {b.route_name || 'No route'} {b.is_online ? '🟢' : '⚫'}
                  </option>
                ))}
              </select>
            )}

            {/* Connection status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              connected ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
            }`}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'Live' : socketMode ? 'Connecting...' : 'Polling'}
            </div>

            {/* Notifications bell */}
            <button onClick={() => setShowNotifs(v => !v)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Auto-pan toggle */}
            <button onClick={() => setAutoPan(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                autoPan
                  ? 'bg-blue-600 text-white border-transparent'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title="Auto-pan map to follow bus"
            >
              <Navigation size={12} /> Follow
            </button>
          </div>
        </div>

        {/* ── Alert banners ─────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="px-4 py-2 space-y-1.5 bg-red-50 dark:bg-red-900/10 border-b border-red-200 dark:border-red-800 shrink-0">
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle size={14} />
                  <span className="font-medium capitalize">
                    {a.type === 'emergency' ? '🚨 EMERGENCY' : '⚠ Overspeed'}:
                  </span>
                  <span>{a.type === 'overspeed' ? `${a.speed} km/h detected` : a.message || 'Driver pressed emergency button'}</span>
                </div>
                <button onClick={() => dismissAlert(a.id)}><X size={14} className="text-red-500" /></button>
              </div>
            ))}
          </div>
        )}

        {/* ── Near stop banner ──────────────────────────────────────────── */}
        {nearStop && (
          <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 shrink-0">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
              <MapPin size={14} />
              <span className="font-medium">
                Van approaching {nearStop.stopName}
                {nearStop.etaMinutes !== null && ` — ETA: ${nearStop.etaMinutes <= 1 ? '< 1 min' : `${nearStop.etaMinutes} min`}`}
              </span>
            </div>
          </div>
        )}

        {/* ── Main content: map + side panel ───────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* Map */}
          <div className="flex-1 relative">
            {activeBusId ? (
              <Suspense fallback={<div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900"><PageLoader /></div>}>
                <TrackingMap
                  busLocation={liveLocation}
                  routeStops={routeStops}
                  breadcrumb={breadcrumb}
                  studentStop={studentStop}
                  height="100%"
                  autoPan={autoPan}
                  showProximityCircle={!isAdmin}
                />
              </Suspense>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 dark:text-gray-600">
                <Bus size={56} className="opacity-30" />
                <p className="text-lg">No bus assigned</p>
                <p className="text-sm">Contact school administration</p>
              </div>
            )}

            {/* Floating status card (bottom-left on map) */}
            {activeBusId && (
              <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px]">
                {/* Trip status */}
                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-2 ${TRIP_STATUS[tripStatus]?.bg}`}>
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className={`text-xs font-semibold ${TRIP_STATUS[tripStatus]?.cls}`}>
                    {TRIP_STATUS[tripStatus]?.label}
                  </span>
                </div>

                {/* Speed */}
                {liveLocation?.speed !== undefined && (
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Speed</span>
                    <span className={`font-bold ${liveLocation.speed > 60 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                      {Math.round(liveLocation.speed)} km/h
                    </span>
                  </div>
                )}

                {/* ETA */}
                {etaMinutes !== null && (
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span className="flex items-center gap-1"><Clock size={10} /> ETA</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {etaMinutes <= 1 ? '< 1 min' : `${etaMinutes} min`}
                    </span>
                  </div>
                )}

                {/* Last update */}
                {liveLocation?.ts && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Updated {new Date(liveLocation.ts).toLocaleTimeString()}
                  </p>
                )}

                {/* Not live indicator */}
                {!isOnline && !liveLocation && (
                  <p className="text-xs text-gray-400">Waiting for bus to start…</p>
                )}
              </div>
            )}
          </div>

          {/* Side panel — stops list */}
          <div className="hidden lg:flex flex-col w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Route Stops ({routeStops.length})
              </p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {routeStops.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No stop data available</p>
              ) : routeStops.map((stop, idx) => {
                const isMyStop = studentStop &&
                  Math.abs(+stop.latitude - +studentStop.latitude) < 0.0001;
                return (
                  <div key={stop.id}
                    className={`px-4 py-3 flex items-start gap-3 ${isMyStop ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                      isMyStop
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isMyStop ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                        {stop.stop_name}
                        {isMyStop && <span className="ml-1 text-xs">★</span>}
                      </p>
                      {stop.pickup_time && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {stop.pickup_time}
                        </p>
                      )}
                      {stop.landmark && (
                        <p className="text-xs text-gray-400 truncate">📍 {stop.landmark}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Notification drawer (slide-in) ────────────────────────────── */}
        {showNotifs && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowNotifs(false)}>
            <div className="bg-white dark:bg-gray-900 w-80 h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">Notifications</h2>
                <button onClick={() => setShowNotifs(false)}><X size={18} className="text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                    <Bell size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : notifications.map(n => (
                  <div key={n.id} className="px-4 py-3 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                      n.type === 'student_picked' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                      n.type === 'student_dropped' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                    }`}>
                      {n.type === 'student_picked' ? '🚌' : n.type === 'student_dropped' ? '🏠' : '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(n.ts).toLocaleTimeString()}</p>
                    </div>
                    <button onClick={() => dismissNotification(n.id)}>
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
