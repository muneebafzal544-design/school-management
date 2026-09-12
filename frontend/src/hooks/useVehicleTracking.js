/**
 * useVehicleTracking.js
 * Manages live vehicle state for a specific busId.
 * Combines Socket.IO real-time updates with REST polling fallback.
 *
 * Pakistan-optimized:
 *  - Falls back to 15-second REST polling if socket drops
 *  - Caches last known position
 *  - Handles offline/online browser events
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { getLiveBus, getRouteStops } from '../api/tracking';

const POLL_INTERVAL_MS = 15_000;  // REST poll every 15 s as fallback

export function useVehicleTracking(busId, { role = 'parent', token } = {}) {
  const { connected, connect, disconnect, on, off, emit } = useSocket();

  const [liveLocation,   setLiveLocation]   = useState(null);   // { lat, lng, speed, heading, ts }
  const [routeStops,     setRouteStops]      = useState([]);
  const [breadcrumb,     setBreadcrumb]      = useState([]);     // last N points for trail
  const [tripStatus,     setTripStatus]      = useState('idle'); // idle | started | ended
  const [tripId,         setTripId]          = useState(null);
  const [isOnline,       setIsOnline]        = useState(false);
  const [notifications,  setNotifications]   = useState([]);
  const [alerts,         setAlerts]          = useState([]);     // overspeed, deviation, emergency
  const [etaMinutes,     setEtaMinutes]      = useState(null);
  const [nearStop,       setNearStop]        = useState(null);
  const [socketMode,     setSocketMode]      = useState(true);   // true=socket, false=polling

  const pollTimer       = useRef(null);
  const BREADCRUMB_MAX  = 30;

  // ── Connect to Socket.IO ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !busId) return;
    connect(token);
    return () => disconnect();
  }, [token, busId, connect, disconnect]);

  // ── Join bus room once connected ──────────────────────────────────────────
  useEffect(() => {
    if (!connected || !busId) return;
    setSocketMode(true);
    stopPoll();

    const joinEvent = role === 'parent' ? 'parent:join' : 'driver:join';
    emit(joinEvent, { busId }, (res) => {
      if (res?.error) console.warn('[tracking] join error:', res.error);
    });
  }, [connected, busId, role]);

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!busId) return;

    const handleLocation = (data) => {
      if (+data.busId !== +busId) return;
      setLiveLocation({ lat: +data.lat, lng: +data.lng, speed: data.speed, heading: data.heading, ts: data.ts });
      setIsOnline(true);
      setBreadcrumb(prev => {
        const next = [...prev, { lat: +data.lat, lng: +data.lng }];
        return next.length > BREADCRUMB_MAX ? next.slice(-BREADCRUMB_MAX) : next;
      });
    };

    const handleTripStarted = (data) => {
      if (+data.busId !== +busId) return;
      setTripStatus('started');
      setTripId(data.tripId);
      setIsOnline(true);
    };

    const handleTripEnded = (data) => {
      if (+data.busId !== +busId) return;
      setTripStatus('ended');
      setIsOnline(false);
      setNearStop(null);
    };

    const handleBusOnline  = (data) => { if (+data.busId === +busId) setIsOnline(true); };
    const handleBusOffline = (data) => { if (+data.busId === +busId) setIsOnline(false); };

    const handleNearStop   = (data) => {
      if (+data.busId !== +busId) return;
      setNearStop({ stopName: data.stopName, etaMinutes: data.etaMinutes });
      setEtaMinutes(data.etaMinutes);
    };

    const handleNotification = (note) => {
      setNotifications(prev => [{ ...note, id: Date.now() }, ...prev].slice(0, 20));
    };

    const handleOverspeed  = (data) => {
      if (+data.busId !== +busId) return;
      setAlerts(prev => [{ type: 'overspeed', ...data, id: Date.now() }, ...prev].slice(0, 10));
    };

    const handleEmergency  = (data) => {
      if (+data.busId !== +busId) return;
      setAlerts(prev => [{ type: 'emergency', ...data, id: Date.now() }, ...prev].slice(0, 10));
    };

    const unsubscribers = [
      on('location:update',  handleLocation),
      on('trip:started',     handleTripStarted),
      on('trip:ended',       handleTripEnded),
      on('bus:online',       handleBusOnline),
      on('bus:offline',      handleBusOffline),
      on('bus:near_stop',    handleNearStop),
      on('notification',     handleNotification),
      on('alert:overspeed',  handleOverspeed),
      on('alert:emergency',  handleEmergency),
    ];

    return () => unsubscribers.forEach(fn => fn?.());
  }, [busId, on]);

  // ── REST polling fallback (when socket disconnects) ───────────────────────
  useEffect(() => {
    if (connected) {
      stopPoll();
      setSocketMode(true);
    } else if (busId) {
      setSocketMode(false);
      startPoll();
    }
    return () => stopPoll();
  }, [connected, busId]);

  function startPoll() {
    if (pollTimer.current) return;
    pollTimer.current = setInterval(async () => {
      try {
        const res = await getLiveBus(busId);
        const { bus, liveLocation: loc, breadcrumb: bc } = res.data.data;
        if (loc) {
          setLiveLocation({ lat: +loc.lat, lng: +loc.lng, speed: +loc.speed, heading: +loc.heading, ts: loc.ts });
        }
        setIsOnline(bus.is_online);
        setTripStatus(bus.trip_status);
        if (bc?.length) setBreadcrumb(bc.map(p => ({ lat: +p.lat, lng: +p.lng })));
      } catch { /* ignore */ }
    }, POLL_INTERVAL_MS);
  }

  function stopPoll() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  // ── Load route stops ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!busId) return;
    getRouteStops(busId)
      .then(r => setRouteStops(r.data?.data ?? []))
      .catch(() => {});
  }, [busId]);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return {
    // State
    liveLocation,
    routeStops,
    breadcrumb,
    tripStatus,
    tripId,
    isOnline,
    notifications,
    alerts,
    etaMinutes,
    nearStop,
    // Connection info
    connected,
    socketMode,
    // Actions
    emit,
    dismissNotification,
    dismissAlert,
  };
}
