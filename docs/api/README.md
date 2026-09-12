# API Reference

## Base URLs

| Environment | URL |
|-------------|-----|
| Local dev   | `http://localhost:5000` |
| Production  | `https://studentmanagement-backend.vercel.app` |

Interactive Swagger UI: `http://localhost:5000/api/docs`
OpenAPI spec (JSON): `http://localhost:5000/api/docs/spec.json`

---

## Authentication

All protected endpoints require a **Bearer JWT** in the `Authorization` header.

```
Authorization: Bearer <access_token>
```

### Getting a token

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "Administrator",
      "role": "admin"
    }
  }
}
```

- **Access token** expires in 15 minutes
- **Refresh token** expires in 7 days
- Use `POST /api/auth/refresh` with the refresh token to get a new access token

---

## Response Envelope

Every response follows this consistent shape:

```json
// Success — single object
{ "success": true, "data": { ... } }

// Success — list with pagination
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}

// Error
{ "success": false, "message": "Descriptive error message" }
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200  | OK — request succeeded |
| 201  | Created — resource created successfully |
| 400  | Bad Request — validation error or missing fields |
| 401  | Unauthorized — missing or invalid JWT |
| 403  | Forbidden — role does not have permission |
| 404  | Not Found — resource does not exist |
| 422  | Unprocessable Entity — business logic rejection |
| 423  | Locked — account locked (too many failed logins) |
| 429  | Too Many Requests — rate limit exceeded |
| 500  | Internal Server Error |
| 503  | Service Unavailable — database unreachable |

---

## Rate Limits

| Endpoint Group | Limit |
|----------------|-------|
| `POST /auth/login` | 20 requests / 15 minutes per IP |
| All authenticated routes | 300 requests / minute per user |
| Dashboard & analytics | 20 requests / minute per user |
| CSV / Excel exports | 3 requests / hour per user |
| Forgot password | 3 requests / hour per IP |

When a rate limit is exceeded, the API returns:
```json
{ "success": false, "message": "Too many requests. Please slow down." }
```

---

## Role Permissions Matrix

| Endpoint Group | admin | teacher | student | parent |
|----------------|:-----:|:-------:|:-------:|:------:|
| Students (read) | ✅ | ✅ | ❌ | ❌ |
| Students (write) | ✅ | ❌ | ❌ | ❌ |
| Attendance (mark) | ✅ | ✅ | ❌ | ❌ |
| Attendance (read) | ✅ | ✅ | own | own child |
| Fees (read) | ✅ | ✅ | own | own child |
| Fees (write/record) | ✅ | ❌ | ❌ | ❌ |
| Transport | ✅ | ✅ | ✅ | ✅ |
| Chatbot | ✅ | ✅ | ✅ | ✅ |
| Announcements (read) | ✅ | ✅ | ✅ | ✅ |
| Announcements (write) | ✅ | ✅ | ❌ | ❌ |
| Dashboard stats | ✅ | ✅ | own | own child |
| Audit logs | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ |

---

## Pagination

List endpoints accept:

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `page`    | 1       | —   | Page number |
| `limit`   | 20      | 200 | Items per page |

---

## Endpoints Quick Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/me` | Get current user |
| PUT  | `/api/auth/change-password` | Change password |
| POST | `/api/auth/forgot-password` | Request reset email |
| GET  | `/api/auth/sessions` | List active sessions |
| DELETE | `/api/auth/sessions/:id` | Revoke a session |

### Students
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/students` | List (paginated, filterable) |
| POST | `/api/students` | Create |
| GET  | `/api/students/:id` | Get by ID |
| PUT  | `/api/students/:id` | Update |
| DELETE | `/api/students/:id` | Soft delete |
| GET  | `/api/students/export` | Export CSV/Excel |
| POST | `/api/students/import` | Bulk import CSV |
| GET  | `/api/students/import/template` | Download import template |
| POST | `/api/students/:id/reset-credentials` | Reset login credentials |
| POST | `/api/students/promote` | Bulk promote to next grade |

### Attendance
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/attendance` | Submit class attendance |
| GET  | `/api/attendance/class/:classId` | Get attendance for a date |
| GET  | `/api/attendance/monthly` | Monthly summary |
| GET  | `/api/attendance/register` | Full attendance register |
| GET  | `/api/attendance/export` | Export to CSV |

### Fees
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/fees/dashboard-stats` | Fee KPIs |
| GET  | `/api/fees/invoices` | List invoices |
| POST | `/api/fees/invoices` | Create invoice |
| GET  | `/api/fees/invoices/:id` | Get invoice |
| POST | `/api/fees/invoices/generate-monthly` | Bulk generate monthly fees |
| POST | `/api/fees/invoices/apply-late-fees` | Apply late fines |
| GET  | `/api/fees/payments` | List payments |
| POST | `/api/fees/payments` | Record payment |
| DELETE | `/api/fees/payments/:id` | Void payment |
| GET  | `/api/fees/reports/outstanding` | Outstanding balances |
| GET  | `/api/fees/reports/monthly-summary` | Monthly collection report |
| POST | `/api/fees/send-reminders` | Send fee reminders |

### Transport
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/transport/buses` | List buses |
| POST | `/api/transport/buses` | Add bus |
| GET  | `/api/transport/routes` | List routes |
| POST | `/api/transport/routes` | Create route |
| GET  | `/api/transport/drivers` | List drivers |
| POST | `/api/transport/drivers` | Add driver |
| POST | `/api/transport/assign` | Assign student to route |
| GET  | `/api/tracking/location/:busId` | Live bus GPS location |

### Chatbot
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chatbot/query` | Natural language query |

---

## SDK / Client Setup (JavaScript)

```js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // Attempt token refresh then retry
    }
    return Promise.reject(err);
  }
);
```
