/**
 * DriverTrackingPage.jsx
 * Mobile-optimised driver dashboard for live GPS tracking.
 *
 * Features:
 *  - Browser Geolocation API → sends every 8 s via Socket.IO
 *  - Offline queue: failed emits stored in memory, replayed on reconnect
 *  - REST fallback when socket is down (postLocation API)
 *  - Start Trip / End Trip buttons
 *  - Mark Student Picked / Dropped (per assigned stop)
 *  - Emergency / Panic button (large red)
 *  - Connection badge (Live / Polling / Offline)
 *  - Large tap targets (48px+) optimised for low-end Android phones
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { startTrip, endTrip, postLocation, reportEmergency, getRouteStops } from '../api/tracking';
import api from '../api/axios';
import toast from 'react-hot-toast';

// GPS update interval (ms)
const GPS_INTERVAL_MS = 8_000;
// Overspeed threshold shown in UI (km/h)
const SPEED_LIMIT = 60;

// ── Small UI helpers ──────────────────────────────────────────────────────────
function StatusBadge({ connected, socketMode, isTracking }) {
  if (!isTracking) return null;
  let bg, label;
  if (connected && socketMode) { bg = 'bg-emerald-500'; label = 'Live'; }
  else if (!connected && !socketMode) { bg = 'bg-amber-500'; label = 'Polling'; }
  else { bg = 'bg-red-500'; label = 'Offline'; }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-semibold ${bg}`}>
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      {label}
    </span>
  );
}

function SpeedMeter({ speed }) {
  const over = speed > SPEED_LIMIT;
  return (
    <div className={`flex flex-col items-center p-4 rounded-2xl border-2 ${over ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700'}`}>
      <span className={`text-4xl font-black ${over ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
        {Math.round(speed)}
      </span>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">km/h</span>
      {over && (
        <span className="mt-1 text-xs font-bold text-red-600 animate-pulse">⚠ OVERSPEED</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DriverTrackingPage() {
  const { user, token } = useAuth();

  // Tracking hook (for socket connection)
  const {
    connected,
    socketMode,
    emit,
    tripStatus,
  } = useVehicleTracking(null, { role: 'driver', token });

  // Local state
  const [myBus,         setMyBus]         = useState(null);   // { id, name, plate_number }
  const [stops,         setStops]         = useState([]);
  const [isTracking,    setIsTracking]    = useState(false);  // GPS active
  const [currentTrip,   setCurrentTrip]   = useState(null);   // { tripId }
  const [speed,         setSpeed]         = useState(0);
  const [accuracy,      setAccuracy]      = useState(null);
  const [lastPos,       setLastPos]       = useState(null);   // { lat, lng, ts }
  const [gpsError,      setGpsError]      = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [offlineQueue,  setOfflineQueue]  = useState([]);     // failed emits
  const [pickedStops,   setPickedStops]   = useState(new Set());
  const [droppedStops,  setDroppedStops]  = useState(new Set());
  const [emergencyMode, setEmergencyMode] = useState(false);

  const gpsWatchRef  = useRef(null);
  const prevPosRef   = useRef(null);
  const tripIdRef    = useRef(null);

  // ── Load my assigned bus ────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/transport/my-bus-driver')
      .then(r => {
        // /my-bus-driver returns { success, data: busObject|null } — not an array,
        // so the axios interceptor does NOT unwrap it; r.data has the full wrapper.
        const bus = r.data?.data;
        if (bus) {
          setMyBus(bus);
        } else {
          // User is not a specific driver — find their bus from the full list
          api.get('/transport/buses').then(r2 => {
            // /transport/buses returns array response → interceptor unwraps to r2.data = array
            const buses = Array.isArray(r2.data) ? r2.data : (r2.data?.data ?? []);
            const mine = buses.find(b => b.driver_user_id === user?.id) || buses[0] || null;
            setMyBus(mine);
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [user?.id]);

  // ── Load route stops once bus known ────────────────────────────────────────
  useEffect(() => {
    if (!myBus?.id) return;
    getRouteStops(myBus.id)
      .then(r => { const d = r.data; setStops(Array.isArray(d) ? d : (d?.data ?? [])); })
      .catch(() => {});
  }, [myBus?.id]);

  // ── Replay offline queue when socket reconnects ─────────────────────────────
  useEffect(() => {
    if (connected && offlineQueue.length > 0) {
      offlineQueue.forEach(item => emit(item.event, item.data));
      setOfflineQueue([]);
      toast.success(`Synced ${offlineQueue.length} offline update(s)`);
    }
  }, [connected, offlineQueue, emit]);

  // ── Emit or queue helper ────────────────────────────────────────────────────
  const emitOrQueue = useCallback((event, data) => {
    if (connected) {
      emit(event, data);
    } else {
      setOfflineQueue(q => [...q, { event, data }]);
      // REST fallback for location
      if (event === 'location:update') {
        postLocation(data).catch(() => {});
      }
    }
  }, [connected, emit]);

  // ── Compute heading from two GPS points ────────────────────────────────────
  function computeHeading(prev, curr) {
    if (!prev) return 0;
    const dLat = curr.lat - prev.lat;
    const dLng = curr.lng - prev.lng;
    const rad = Math.atan2(dLng, dLat);
    return ((rad * 180) / Math.PI + 360) % 360;
  }

  // ── GPS position handler ────────────────────────────────────────────────────
  const handlePosition = useCallback((pos) => {
    const { latitude: lat, longitude: lng, speed: rawSpeed, accuracy: acc } = pos.coords;
    const ts = new Date().toISOString();

    setGpsError(null);
    setAccuracy(acc);

    // Compute speed from movement if browser doesn't report it
    let speedKmh = 0;
    const prev = prevPosRef.current;
    if (rawSpeed !== null && rawSpeed >= 0) {
      speedKmh = rawSpeed * 3.6; // m/s → km/h
    } else if (prev) {
      const dt = (Date.now() - prev.ts) / 1000;
      const R = 6371;
      const dLat = (lat - prev.lat) * Math.PI / 180;
      const dLng = (lng - prev.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(prev.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const distKm = 2 * R * Math.asin(Math.sqrt(a));
      speedKmh = dt > 0 ? (distKm / dt) * 3600 : 0;
    }

    const heading = computeHeading(prev, { lat, lng });
    setSpeed(speedKmh);
    setLastPos({ lat, lng, ts });
    prevPosRef.current = { lat, lng, ts: Date.now() };

    if (tripIdRef.current && myBus?.id) {
      emitOrQueue('location:update', {
        busId:   myBus.id,
        tripId:  tripIdRef.current,
        lat,
        lng,
        speed:   speedKmh,
        heading,
        accuracy: acc,
        ts,
      });
    }
  }, [myBus?.id, emitOrQueue]);

  // ── Start GPS watch ─────────────────────────────────────────────────────────
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported on this device');
      return;
    }
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => setGpsError(err.message),
      {
        enableHighAccuracy: true,
        maximumAge:         5_000,
        timeout:            15_000,
      }
    );
    setIsTracking(true);
  }, [handlePosition]);

  // ── Stop GPS watch ──────────────────────────────────────────────────────────
  const stopGPS = useCallback(() => {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopGPS(), [stopGPS]);

  // ── Start Trip ──────────────────────────────────────────────────────────────
  async function handleStartTrip() {
    if (!myBus?.id) return toast.error('No bus assigned');
    setLoading(true);
    try {
      // REST is primary (reliable); socket emit is fire-and-forget notification only
      const r = await startTrip({
        busId: myBus.id,
        tripType: 'morning',
        lat: lastPos?.lat,
        lng: lastPos?.lng,
      });
      // Backend returns { success, data: trip } — not an array, so NOT unwrapped by interceptor
      const trip = r.data?.data ?? r.data;
      const tripId = trip?.id;

      // Notify connected clients via socket (non-blocking, no await)
      emit('trip:start', { busId: myBus.id, tripType: 'morning' });

      tripIdRef.current = tripId;
      setCurrentTrip({ tripId });
      startGPS();
      toast.success('Trip started! GPS is now active.');
    } catch (err) {
      toast.error('Failed to start trip');
    } finally {
      setLoading(false);
    }
  }

  // ── End Trip ────────────────────────────────────────────────────────────────
  async function handleEndTrip() {
    if (!currentTrip?.tripId) return;
    setLoading(true);
    try {
      await emit('trip:end', { busId: myBus.id, tripId: currentTrip.tripId });
      await endTrip({ busId: myBus.id, tripId: currentTrip.tripId }).catch(() => {});
      stopGPS();
      tripIdRef.current = null;
      setCurrentTrip(null);
      setPickedStops(new Set());
      setDroppedStops(new Set());
      setSpeed(0);
      setLastPos(null);
      prevPosRef.current = null;
      toast.success('Trip ended. Great job!');
    } catch (err) {
      toast.error('Failed to end trip');
    } finally {
      setLoading(false);
    }
  }

  // ── Mark Student Picked ─────────────────────────────────────────────────────
  function handlePicked(stop) {
    if (!currentTrip) return toast.error('Start a trip first');
    emitOrQueue('student:picked', {
      busId:    myBus.id,
      tripId:   currentTrip.tripId,
      stopId:   stop.id,
      stopName: stop.stop_name,
      lat:      lastPos?.lat,
      lng:      lastPos?.lng,
    });
    setPickedStops(s => new Set([...s, stop.id]));
    toast.success(`✓ Picked up at ${stop.stop_name}`);
  }

  // ── Mark Student Dropped ────────────────────────────────────────────────────
  function handleDropped(stop) {
    if (!currentTrip) return toast.error('Start a trip first');
    emitOrQueue('student:dropped', {
      busId:    myBus.id,
      tripId:   currentTrip.tripId,
      stopId:   stop.id,
      stopName: stop.stop_name,
      lat:      lastPos?.lat,
      lng:      lastPos?.lng,
    });
    setDroppedStops(s => new Set([...s, stop.id]));
    toast.success(`✓ Dropped off at ${stop.stop_name}`);
  }

  // ── Emergency ───────────────────────────────────────────────────────────────
  async function handleEmergency() {
    if (emergencyMode) return; // prevent double-tap
    setEmergencyMode(true);
    try {
      emitOrQueue('emergency', {
        busId:   myBus?.id,
        tripId:  currentTrip?.tripId,
        lat:     lastPos?.lat,
        lng:     lastPos?.lng,
        message: 'Driver triggered emergency alert',
      });
      await reportEmergency({
        busId:   myBus?.id,
        tripId:  currentTrip?.tripId,
        lat:     lastPos?.lat,
        lng:     lastPos?.lng,
        message: 'Driver triggered emergency alert',
      }).catch(() => {});
      toast.error('🚨 Emergency alert sent to admin!', { duration: 8000 });
    } finally {
      // Reset after 30 s so driver can send again if needed
      setTimeout(() => setEmergencyMode(false), 30_000);
    }
  }

  const orderedStops = [...stops].sort((a, b) => a.stop_order - b.stop_order);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-3 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Driver Panel</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {myBus ? `${myBus.bus_number || myBus.vehicle_number}` : 'Loading bus…'}
          </p>
        </div>
        <StatusBadge connected={connected} socketMode={socketMode} isTracking={isTracking} />
      </div>

      {/* GPS Error */}
      {gpsError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          ⚠ GPS: {gpsError}
        </div>
      )}

      {/* Offline Queue badge */}
      {offlineQueue.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
          📦 {offlineQueue.length} update(s) queued — will sync when online
        </div>
      )}

      {/* Speed + GPS info card */}
      {isTracking && (
        <div className="mb-4 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-3">
            <SpeedMeter speed={speed} />
            <div className="flex flex-col justify-center gap-1 pl-2">
              {lastPos && (
                <>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Lat:</span>{' '}
                    {lastPos.lat.toFixed(5)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Lng:</span>{' '}
                    {lastPos.lng.toFixed(5)}
                  </div>
                </>
              )}
              {accuracy !== null && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Accuracy:</span>{' '}
                  ±{Math.round(accuracy)} m
                </div>
              )}
              {lastPos && (
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {new Date(lastPos.ts).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trip control buttons */}
      <div className="mb-4 grid grid-cols-1 gap-3">
        {!currentTrip ? (
          <button
            onClick={handleStartTrip}
            disabled={loading || !myBus}
            className="w-full py-5 rounded-2xl text-white text-lg font-bold bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            style={{ minHeight: 64 }}
          >
            {loading ? 'Starting…' : '▶ Start Trip'}
          </button>
        ) : (
          <button
            onClick={handleEndTrip}
            disabled={loading}
            className="w-full py-5 rounded-2xl text-white text-lg font-bold bg-slate-600 hover:bg-slate-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg"
            style={{ minHeight: 64 }}
          >
            {loading ? 'Ending…' : '■ End Trip'}
          </button>
        )}
      </div>

      {/* Emergency Button */}
      <button
        onClick={handleEmergency}
        disabled={emergencyMode || !myBus}
        className={`w-full mb-6 py-6 rounded-2xl text-white text-xl font-black tracking-wide shadow-xl active:scale-95 transition-all ${emergencyMode
          ? 'bg-red-300 cursor-not-allowed'
          : 'bg-red-600 hover:bg-red-700 animate-[pulse_3s_ease-in-out_infinite]'
        }`}
        style={{ minHeight: 72 }}
      >
        {emergencyMode ? '🚨 Alert Sent' : '🚨 EMERGENCY'}
      </button>

      {/* Route Stops */}
      {orderedStops.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm mb-6">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">
              Route Stops ({orderedStops.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {orderedStops.map((stop, idx) => {
              const picked  = pickedStops.has(stop.id);
              const dropped = droppedStops.has(stop.id);
              return (
                <div key={stop.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Order badge */}
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${picked || dropped ? 'bg-slate-300 dark:bg-slate-600' : 'bg-amber-400'}`}>
                    {idx + 1}
                  </div>
                  {/* Stop info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {stop.stop_name}
                    </p>
                    {stop.pickup_time && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {stop.pickup_time}
                      </p>
                    )}
                    {picked && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Picked up</p>
                    )}
                    {dropped && (
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">✓ Dropped off</p>
                    )}
                  </div>
                  {/* Action buttons */}
                  {currentTrip && !dropped && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {!picked && (
                        <button
                          onClick={() => handlePicked(stop)}
                          className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 active:scale-95 transition-all"
                          style={{ minHeight: 36 }}
                        >
                          Picked
                        </button>
                      )}
                      {picked && (
                        <button
                          onClick={() => handleDropped(stop)}
                          className="px-3 py-2 text-xs font-bold rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 active:scale-95 transition-all"
                          style={{ minHeight: 36 }}
                        >
                          Dropped
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions when idle */}
      {!currentTrip && (
        <div className="text-center text-sm text-slate-400 dark:text-slate-500 pb-6">
          <p className="mb-1">Press <strong>Start Trip</strong> to begin tracking.</p>
          <p>Your location will update parents in real time.</p>
        </div>
      )}
    </div>
  );
}
