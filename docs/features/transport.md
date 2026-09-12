# Transport System

## Overview

The transport module manages school buses, routes, drivers, and student assignments. It includes real-time GPS tracking that parents can view on a live map.

---

## Components

### 1. Buses
Each bus record stores:
- Bus number (unique identifier)
- Seating capacity
- Vehicle details (make, model, year)
- Assigned driver
- Assigned route
- Status (active / maintenance)

### 2. Drivers
Driver profiles include:
- Personal details (name, CNIC, phone)
- License number and expiry date
- Current bus assignment

The system warns when a driver's license is about to expire (configurable threshold, default 30 days).

### 3. Routes
A route represents a fixed path with named stops. Each route has:
- Named stops in order
- Morning departure time (from first stop)
- Evening departure time (from school)
- Assigned bus and driver

### 4. Student Assignments
Students are linked to a route and a specific pickup stop. When a student is assigned:
- Their parent can see live bus tracking
- Their bus details appear on the student portal

---

## Live Tracking

### How It Works

```
Driver App (mobile)
    │
    │  Socket.IO event: "bus:location"
    │  Payload: { busId, lat, lng, speed, heading }
    ▼
Express Server
    │
    ├── Saves to vehicle_tracking table (for history)
    │
    └── Broadcasts to room "bus:{busId}" via Socket.IO
            │
            ▼
        Parent Web/App
        (subscribed to "bus:{busId}" events)
        Live map updates every ~10 seconds
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tracking/location/:busId` | Last known GPS position |
| POST | `/api/tracking/location` | Driver pushes GPS update |
| GET | `/api/tracking/history/:busId` | Historical path for a date |

### Map Implementation

The frontend uses **React Leaflet** with OpenStreetMap tiles. The live tracking page:
1. Connects to Socket.IO with JWT authentication
2. Subscribes to `bus:{busId}` room
3. Updates the map marker position on each incoming event
4. Shows speed, heading, and last-updated timestamp

---

## API Reference

### List Buses
```http
GET /api/transport/buses
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "bus_number": "SKL-001",
      "capacity": 40,
      "driver_id": 2,
      "driver_name": "Imran Ali",
      "driver_phone": "+923331234567",
      "route_id": 1,
      "route_name": "Route A – Johar Town",
      "assigned_students": 34,
      "status": "active"
    }
  ]
}
```

### Create a Route
```http
POST /api/transport/routes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Route B – DHA",
  "stops": ["DHA Phase 1 Gate 3", "DHA Phase 3 Chowk", "School"],
  "morning_departure": "07:00",
  "evening_departure": "14:00",
  "bus_id": 2,
  "driver_id": 3
}
```

### Assign Student to Route
```http
POST /api/transport/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "student_id": 15,
  "route_id": 2,
  "pickup_stop": "DHA Phase 1 Gate 3"
}
```

### Get Live Location
```http
GET /api/tracking/location/1
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "bus_id": 1,
    "lat": 31.5204,
    "lng": 74.3587,
    "speed": 35.0,
    "heading": 180.0,
    "timestamp": "2024-07-15T08:15:00Z"
  }
}
```

---

## Driver App Integration

The mobile app (student-mobile) includes a **driver mode**:

1. Driver logs in with their teacher/driver account
2. Opens the Driver Tracking screen
3. The app sends GPS updates via Socket.IO every 10 seconds
4. Parents subscribed to that bus see the live location

The location update payload:
```json
{
  "event": "bus:location",
  "data": {
    "busId": 1,
    "lat": 31.5204,
    "lng": 74.3587,
    "speed": 35,
    "heading": 180,
    "timestamp": "2024-07-15T08:15:00.000Z"
  }
}
```

---

## Admin Workflow

### Setting Up Transport from Scratch

1. **Add buses** — Go to Transport → Buses → Add Bus
2. **Add drivers** — Go to Transport → Drivers → Add Driver
3. **Create routes** — Go to Transport → Routes → Create Route
   - Define stops in order
   - Assign a bus and driver
4. **Assign students** — On each student's profile → Transport tab → Select route and stop
5. **Verify** — Parents can now see their child's bus on the live map

### Managing the Fleet

- Update driver assignments when a driver changes buses
- Set bus to "Maintenance" status when off-road
- Track license expiry dates in the driver list
