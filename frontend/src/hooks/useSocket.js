/**
 * useSocket.js
 * Generic Socket.IO connection hook.
 * Handles connect/disconnect, auth token injection, and reconnect logic.
 * Pakistan-optimized: polling fallback, generous timeouts, offline detection.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Strip /api/v1 or /api suffix to get the bare server origin
const _apiUrl   = import.meta.env.VITE_API_URL || '';
const _derived  = _apiUrl.replace(/\/api(\/v\d+)?$/, '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || _derived || 'http://localhost:5000';

export function useSocket({ autoConnect = false } = {}) {
  const socketRef = useRef(null);
  const [connected,    setConnected]    = useState(false);
  const [connecting,   setConnecting]   = useState(false);
  const [error,        setError]        = useState(null);
  const listenersRef   = useRef([]);  // { event, handler }

  const connect = useCallback((token) => {
    if (socketRef.current?.connected) return;
    setConnecting(true);
    setError(null);

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],  // WS first, polling fallback
      timeout: 20_000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 30_000,   // back off to 30 s max
      randomizationFactor: 0.3,
    });

    socket.on('connect', () => {
      setConnected(true);
      setConnecting(false);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason === 'io server disconnect') {
        // Server explicitly closed — don't auto-reconnect
        setError('Disconnected by server');
      }
    });

    socket.on('connect_error', (err) => {
      setConnecting(false);
      setError(err.message);
    });

    // Re-attach all registered listeners
    listenersRef.current.forEach(({ event, handler }) => {
      socket.on(event, handler);
    });

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnected(false);
  }, []);

  // Register a persistent event listener (survives reconnects)
  const on = useCallback((event, handler) => {
    listenersRef.current.push({ event, handler });
    socketRef.current?.on(event, handler);
    return () => off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    listenersRef.current = listenersRef.current.filter(
      l => l.event !== event || l.handler !== handler
    );
    socketRef.current?.off(event, handler);
  }, []);

  const emit = useCallback((event, data, ack) => {
    if (!socketRef.current?.connected) return Promise.resolve({ error: 'not_connected' });
    return new Promise(resolve => {
      if (ack) {
        socketRef.current.emit(event, data, resolve);
      } else {
        socketRef.current.emit(event, data);
        resolve({ ok: true });
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
    connecting,
    error,
    connect,
    disconnect,
    on,
    off,
    emit,
  };
}
