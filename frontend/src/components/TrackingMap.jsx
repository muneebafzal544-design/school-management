/**
 * TrackingMap.jsx
 * Live vehicle tracking map built with Leaflet + react-leaflet.
 * Uses OpenStreetMap tiles — FREE, no API key, works in Pakistan.
 *
 * Props:
 *  busLocation   { lat, lng, speed, heading }  — live bus position
 *  routeStops    [{ id, stop_name, latitude, longitude, stop_order, pickup_time }]
 *  breadcrumb    [{ lat, lng }]                — trail of past positions
 *  studentStop   { latitude, longitude, stop_name } — highlighted stop for this parent
 *  height        string (CSS height, default '100%')
 *  onMapReady    callback(map)
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix default icon paths (Leaflet + Vite issue) ─────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom bus icon (rotating arrow) ─────────────────────────────────────────
function createBusIcon(heading = 0, isOnline = true) {
  const color = isOnline ? '#2563eb' : '#9ca3af';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <g transform="rotate(${heading}, 24, 24)">
        <circle cx="24" cy="24" r="20" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>
        <polygon points="24,8 18,32 24,28 30,32" fill="${color}"/>
        <circle cx="24" cy="24" r="5" fill="${color}"/>
      </g>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

// ── Custom stop icon ──────────────────────────────────────────────────────────
const stopIcon = L.divIcon({
  html: `<div style="
    width:28px; height:28px; border-radius:50%;
    background:#f59e0b; border:3px solid #fff;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
    font-size:11px; font-weight:700; color:#fff; font-family:sans-serif;
  ">S</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const myStopIcon = L.divIcon({
  html: `<div style="
    width:34px; height:34px; border-radius:50%;
    background:#10b981; border:3px solid #fff;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
    font-size:12px; font-weight:700; color:#fff; font-family:sans-serif;
  ">★</div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
});

// ── PanToVehicle: auto-pan map when bus moves ─────────────────────────────────
function PanToVehicle({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.panTo([position.lat, position.lng], { animate: true, duration: 1 });
    }
  }, [position, map]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TrackingMap({
  busLocation,
  routeStops = [],
  breadcrumb = [],
  studentStop = null,
  height = '100%',
  autoPan = true,
  showProximityCircle = true,
}) {
  // Default center: Pakistan (Lahore)
  const defaultCenter = [31.5204, 74.3587];
  const center = busLocation
    ? [busLocation.lat, busLocation.lng]
    : (routeStops[0]
        ? [+routeStops[0].latitude, +routeStops[0].longitude]
        : defaultCenter);

  // Polyline of route stops (ordered)
  const routeLine = routeStops
    .filter(s => s.latitude && s.longitude)
    .sort((a, b) => a.stop_order - b.stop_order)
    .map(s => [+s.latitude, +s.longitude]);

  // Breadcrumb trail points
  const trailPoints = breadcrumb.map(p => [+p.lat, +p.lng]);

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={true}
      >
        {/* OpenStreetMap tiles — free, no API key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Auto-pan to follow bus */}
        {autoPan && busLocation && <PanToVehicle position={busLocation} />}

        {/* Route line connecting stops */}
        {routeLine.length >= 2 && (
          <Polyline positions={routeLine} color="#3b82f6" weight={3} opacity={0.5} dashArray="8 4" />
        )}

        {/* Breadcrumb trail */}
        {trailPoints.length >= 2 && (
          <Polyline positions={trailPoints} color="#2563eb" weight={3} opacity={0.8} />
        )}

        {/* Route stops */}
        {routeStops.filter(s => s.latitude && s.longitude).map(stop => {
          const isMyStop = studentStop && +stop.latitude === +studentStop.latitude
            && +stop.longitude === +studentStop.longitude;
          return (
            <Marker
              key={stop.id}
              position={[+stop.latitude, +stop.longitude]}
              icon={isMyStop ? myStopIcon : stopIcon}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>{stop.stop_name}</p>
                  {stop.pickup_time && (
                    <p style={{ fontSize: 12, color: '#6b7280' }}>
                      Pickup: {stop.pickup_time}
                    </p>
                  )}
                  {stop.dropoff_time && (
                    <p style={{ fontSize: 12, color: '#6b7280' }}>
                      Drop-off: {stop.dropoff_time}
                    </p>
                  )}
                  {stop.landmark && (
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      📍 {stop.landmark}
                    </p>
                  )}
                  {isMyStop && (
                    <p style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 4 }}>
                      ★ Your pickup point
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Student's stop proximity circle (500 m) */}
        {studentStop && showProximityCircle && studentStop.latitude && studentStop.longitude && (
          <Circle
            center={[+studentStop.latitude, +studentStop.longitude]}
            radius={500}
            color="#10b981"
            fillColor="#10b981"
            fillOpacity={0.08}
            weight={1}
          />
        )}

        {/* Live bus marker */}
        {busLocation && (
          <Marker
            position={[busLocation.lat, busLocation.lng]}
            icon={createBusIcon(busLocation.heading || 0, true)}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <p style={{ fontWeight: 700, marginBottom: 4, color: '#2563eb' }}>
                  🚌 School Van
                </p>
                {busLocation.speed !== undefined && (
                  <p style={{ fontSize: 12, color: '#374151' }}>
                    Speed: <strong>{Math.round(busLocation.speed)} km/h</strong>
                    {busLocation.speed > 60 && (
                      <span style={{ color: '#ef4444', marginLeft: 4 }}>⚠ Overspeed</span>
                    )}
                  </p>
                )}
                {busLocation.ts && (
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    Updated: {new Date(busLocation.ts).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
