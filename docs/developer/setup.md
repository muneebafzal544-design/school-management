# Developer Setup Guide

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| npm | 9+ | Comes with Node.js |
| PostgreSQL | 14+ | Local install or Docker |
| Git | any | |

Optional but recommended:
- **Redis** — for caching (system works without it, caching is bypassed)
- **Docker** — for running PostgreSQL easily

---

## 1. Clone the Repository

```bash
git clone <repo-url>
cd student-management
```

---

## 2. Backend Setup

```bash
cd backend
npm install
```

### Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/school_db

# JWT secret — use a long random string (32+ chars)
JWT_SECRET=replace_this_with_something_very_random_and_long

# Server port
PORT=5000

# Node environment
NODE_ENV=development

# Optional: Redis (leave blank to disable caching)
REDIS_URL=redis://localhost:6379

# Optional: Cloudinary (for photo uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional: Email (SMTP for password reset, fee reminders)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM="School System <your@gmail.com>"
```

### Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE school_db;"

# Run migrations (creates all tables)
node src/db/migrate.js

# Seed demo data
node src/db/seed.js
```

After seeding, the following demo accounts are available:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Teacher | `teacher` | `teacher123` |
| Student | `student` | `student123` |
| Parent | `parent` | `parent123` |

### Start the Backend

```bash
npm run dev        # Development (auto-restart with nodemon)
npm start          # Production
```

The API is available at: `http://localhost:5000`
Swagger docs: `http://localhost:5000/api/docs`

---

## 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### Environment Variables

```bash
cp .env.example .env
```

```env
# Backend API base URL
VITE_API_URL=http://localhost:5000

# Show demo login cards in development
VITE_SHOW_DEMO_ACCOUNTS=true

# For mobile app local testing (use your machine's local IP)
# VITE_API_URL=http://192.168.1.100:5000
```

### Start the Frontend

```bash
npm run dev
```

The frontend is available at: `http://localhost:5173`

---

## 4. Running Both Together

In the project root, you can use two terminals:

**Terminal 1 (backend):**
```bash
cd backend && npm run dev
```

**Terminal 2 (frontend):**
```bash
cd frontend && npm run dev
```

---

## 5. Mobile App Setup

```bash
cd ../student-mobile
npm install
```

```bash
# Start Expo dev server
npx expo start
```

- Scan the QR code with **Expo Go** on your phone
- Make sure your phone and computer are on the same Wi-Fi network
- Set `VITE_API_URL` (or `API_URL` in `constants/`) to your machine's local IP, not `localhost`

---

## 6. Running Migrations

Migrations are plain SQL files in `backend/src/db/migrations/`.

```bash
# Run all pending migrations
node src/db/migrate.js

# To add a new migration:
# 1. Create a file: src/db/migrations/069_your_feature.sql
# 2. Run: node src/db/migrate.js
```

Migration files are applied in alphabetical order and tracked in a `migrations` table.

---

## 7. Running Tests

```bash
cd backend
npm test
```

Tests are in `backend/src/tests/`. The project uses Node's built-in test runner.

---

## 8. Building for Production

### Frontend

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`. Deploy this directory to any static host (Vercel, Netlify, S3).

### Backend

The backend is deployed as a Node.js server or as Vercel serverless functions (via `vercel.json`).

```bash
cd backend
npm start
```

---

## 9. Deployment (Vercel)

The project is pre-configured for Vercel:

**Backend:** Uses `vercel.json` with serverless function routing. Background jobs (pg-boss) are automatically disabled on Vercel.

**Frontend:** Deploy `frontend/` as a Vite static site.

```bash
# From project root
vercel deploy
```

Set environment variables in the Vercel dashboard under **Project Settings → Environment Variables**.

---

## Common Issues

### `ECONNREFUSED` connecting to PostgreSQL
- Make sure PostgreSQL is running: `pg_ctl start` or `sudo service postgresql start`
- Verify `DATABASE_URL` in `.env` matches your local setup

### `JWT_SECRET is not set`
- The server will refuse to start if `JWT_SECRET` is missing — check `.env`

### Migrations fail
- Ensure the database exists: `psql -U postgres -c "CREATE DATABASE school_db;"`
- Check for typos in `DATABASE_URL`

### Frontend shows blank page / API errors
- Confirm `VITE_API_URL` points to the correct backend port
- Check the browser console — CORS errors mean the frontend URL is not in the backend's allowed origins

### Mobile app can't reach the API
- Use your machine's local IP (e.g., `192.168.1.100:5000`), not `localhost`
- Check that your firewall allows port 5000
