# System Architecture

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | React 19, Vite 6 |
| Styling | Tailwind CSS | v4 |
| State/Data | TanStack React Query | v5 |
| Charts | Recharts | v3 |
| Maps | React Leaflet | v5 |
| HTTP Client | Axios | v1 |
| Backend | Node.js + Express | Express 4 |
| Database | PostgreSQL | 14+ |
| ORM/Query | Raw SQL (pg driver) | pg v8 |
| Auth | JWT (access + refresh) | jsonwebtoken v9 |
| File Storage | Cloudinary | v2 |
| Caching | Redis (ioredis) | v5 |
| Background Jobs | pg-boss | v12 |
| Real-time | Socket.IO | v4 |
| PDF Generation | PDFKit | v0.18 |
| Email | Nodemailer | v8 |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) | — |
| Mobile | Expo + React Native + Expo Router | SDK 53 |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Clients                          │
│   React Web App     Mobile App (Expo)   External APIs  │
└──────────┬─────────────────┬────────────────┬───────────┘
           │  HTTP/REST      │  HTTP/REST     │  Webhooks
           ▼                 ▼                ▼
┌─────────────────────────────────────────────────────────┐
│              Express API Server (Node.js)               │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Routes  │  │Middleware│  │Controllers│             │
│  │ (67 files)│  │JWT+RBAC  │  │(Business │             │
│  └──────────┘  └──────────┘  │  Logic)  │             │
│                               └──────────┘             │
│  ┌───────────┐   ┌──────────────────────────┐          │
│  │Socket.IO  │   │   pg-boss Job Queue       │          │
│  │(Real-time)│   │(CSV import, bulk email)   │          │
│  └───────────┘   └──────────────────────────┘          │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  ┌────────────┐  ┌─────────────┐  ┌──────────┐
  │ PostgreSQL │  │    Redis    │  │Cloudinary│
  │ (Primary)  │  │  (Cache)    │  │ (Files)  │
  └────────────┘  └─────────────┘  └──────────┘
```

---

## Backend Directory Structure

```
backend/src/
├── index.js                   # App entry point — middleware, routes, server
├── config/
│   └── swagger.js             # OpenAPI spec definition
├── controllers/               # Business logic (67 controllers)
│   ├── authController.js
│   ├── studentController.js
│   ├── feeController.js
│   └── ...
├── routes/                    # Express routers (67 route files)
│   ├── authRoutes.js
│   ├── studentRoutes.js
│   └── ...
├── middleware/
│   ├── authMiddleware.js      # JWT verification + RBAC (verifyToken, requireRole)
│   ├── auditLog.js            # Action audit logging
│   ├── errorHandler.js        # Centralized error handling
│   ├── upload.js              # Multer config (photos, docs, CSVs)
│   ├── validate.js            # Request body validators
│   ├── requestId.js           # UUID per request for tracing
│   ├── security.js            # Security headers
│   └── planEnforcement.js     # Subscription plan gating
├── services/
│   ├── chatbotService.js      # AI chatbot intent resolution
│   ├── socketService.js       # Socket.IO event handlers
│   ├── metricsService.js      # Request metrics collection
│   └── ...
├── utils/
│   ├── logger.js              # Pino structured logging
│   ├── scheduler.js           # Cron job scheduler
│   └── validateEnv.js         # Startup env var check
├── jobs/
│   ├── queue.js               # pg-boss queue setup
│   └── processors/
│       ├── csvImportProcessor.js
│       └── emailProcessor.js
├── db/
│   ├── index.js               # Pool setup + tenant schema routing
│   ├── migrate.js             # Migration runner
│   ├── seed.js                # Demo data seeder
│   └── migrations/            # 86 SQL migration files (001–086)
└── uploads/                   # Temporary file storage
```

---

## Frontend Directory Structure

```
frontend/src/
├── pages/                     # 93 page components (one per route)
├── components/                # Reusable UI components
│   ├── chatbot/
│   │   └── ChatbotWidget.jsx  # Floating AI assistant widget
│   ├── Layout.jsx             # App shell (sidebar + topbar)
│   └── ...
├── api/                       # 53 API client modules
│   ├── auth.js                # login, refresh, logout, me
│   ├── students.js            # CRUD + import/export
│   ├── fees.js                # Invoices, payments, reports
│   └── ...
├── context/
│   └── AuthContext.jsx        # Auth state + signIn/signOut
├── hooks/                     # Custom React hooks
├── utils/                     # Helpers (formatCurrency, formatDate, etc.)
└── constants/                 # App-wide constants
```

---

## Request Lifecycle

A typical authenticated API request flows like this:

```
Client Request
    │
    ▼
apiLimiter          — global rate limit (300/min per IP)
    │
    ▼
CORS                — validates Origin header
    │
    ▼
helmet              — security headers
    │
    ▼
requestId           — assigns X-Request-ID UUID
    │
    ▼
verifyToken         — validates JWT, attaches req.user
    │
    ▼
requirePasswordChanged — forces password change if flagged
    │
    ▼
userLimiter         — per-user rate limit (300/min)
    │
    ▼
requireRole(...)    — checks req.user.role against allowed roles
    │
    ▼
auditMiddleware     — async audit log (fire-and-forget)
    │
    ▼
Controller          — DB query, business logic, response
    │
    ▼
errorHandler        — catches thrown errors, formats response
```

---

## Authentication Flow

```
1. POST /api/auth/login
   └─ Validate username/password
   └─ Check login_attempts table (lockout after 5 failures in 15 min)
   └─ bcrypt.compare(password, hash)
   └─ Generate accessToken (JWT, 15 min) + refreshToken (JWT, 7 days)
   └─ Store refreshToken in user_sessions table
   └─ Return tokens + user profile

2. Client stores tokens in localStorage

3. Every request: Authorization: Bearer <accessToken>
   └─ verifyToken middleware decodes JWT → req.user

4. When accessToken expires (401):
   └─ POST /api/auth/refresh { refreshToken }
   └─ Server validates refreshToken against user_sessions
   └─ Issues new accessToken

5. POST /api/auth/logout
   └─ Deletes session from user_sessions table
   └─ Client clears localStorage
```

---

## Database Connection & Tenant Routing

The system supports multi-tenant setups via PostgreSQL schemas:

```js
// backend/src/db/index.js

// AsyncLocalStorage holds the current request's tenant schema name
const als = new AsyncLocalStorage();

// Middleware sets the schema for each request:
// app.use((req, res, next) => {
//   als.run({ schema: req.tenantSchema }, next);
// });

// Every pool.query() auto-prepends SET search_path:
const wrappedQuery = async (text, params) => {
  const store = als.getStore();
  if (store?.schema) {
    await pool.query(`SET search_path TO "${store.schema}", public`);
  }
  return pool.query(text, params);
};
```

In single-tenant mode (current default), all tables are in the `public` schema.

---

## Caching Strategy

Redis caches are used for:

| Cache Key | TTL | What's cached |
|-----------|-----|---------------|
| `fee_structures:{schoolId}` | 1 hour | Fee structures (rarely change) |
| `dashboard_stats:{userId}` | 5 min | Dashboard KPIs |
| `timetable:{classId}` | 30 min | Class timetable |
| `classes_list` | 15 min | All classes list |

Cache is invalidated on mutations (POST/PUT/DELETE to the same resource).

If Redis is unavailable, the system falls back to direct DB queries silently.

---

## Real-Time Features (Socket.IO)

Socket.IO is used for:

| Event | Direction | Description |
|-------|-----------|-------------|
| `attendance:submitted` | Server → Client | Notifies dashboard when attendance is marked |
| `bus:location` | Client → Server → Client | Driver app pushes GPS; parents receive update |
| `chat:message` | Bidirectional | Class group chat messages |
| `notification:new` | Server → Client | Push notification delivery |

Clients authenticate their Socket.IO connection with the same JWT.

---

## Background Jobs (pg-boss)

Long-running operations run in the background:

| Job | Trigger | Description |
|-----|---------|-------------|
| `csv-import` | File upload | Processes large student/teacher CSV imports |
| `bulk-email` | Fee reminders | Sends 100s of reminder emails without blocking the request |
| `daily-report` | Cron (midnight) | Generates and caches daily analytics |
| `late-fee-check` | Cron (daily) | Marks overdue invoices and applies fines |

> pg-boss is disabled on Vercel (serverless). Background tasks run as Vercel Cron functions instead.

---

## Error Handling

All controller errors propagate to the centralised `errorHandler` middleware:

```js
// Thrown anywhere in a controller:
const err = new Error('Student not found');
err.status = 404;
throw err;

// errorHandler catches and responds:
res.status(err.status || 500).json({
  success: false,
  message: err.message,
  ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
});
```

---

## Security Measures

| Concern | Implementation |
|---------|---------------|
| SQL Injection | All queries use `$N` parameterized placeholders — never string concatenation |
| XSS | React escapes output by default; Helmet sets CSP headers |
| CSRF | JWT-in-header pattern is CSRF-safe (no cookies) |
| Brute force | Rate limiting on login + account lockout after 5 failures |
| Password storage | bcryptjs with salt rounds = 10 |
| Sensitive data | Passwords never returned in API responses |
| File uploads | Multer validates MIME type and size; files stored in Cloudinary, not on disk |
| Audit trail | Every admin action logged with user ID, timestamp, and diff |
