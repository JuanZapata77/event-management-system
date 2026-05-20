# Event Management System

A full-stack event management application with manager and worker portals.

## Deployment

- **Frontend (Vercel):** https://event-management-system-mejf.vercel.app
- **Backend (Render):** https://event-management-system-rpkt.onrender.com
- **Database (Supabase):** PostgreSQL (hosted)

## Demo Credentials

- **Manager Login:**
  - Username: `manager`
  - Password: `Manager@123`

## Features

- Manager dashboard for event and staff management
- Worker portal for shift availability and assignments
- Real-time event status automation
- Payment tracking and reporting

## Local Development

### Backend
```bash
cd backend
npm install
npm start
```

Requires `.env` with `DB_*` variables pointing to local PostgreSQL or Supabase.

### Frontend
```bash
cd frontend
npm install
npm start
```

Requires `REACT_APP_API_URL` env var (defaults to `http://localhost:5000`).

## Auto-Deploy

- Frontend: Auto-deploys on pushes to `main` (Vercel)
- Backend: Auto-deploys on pushes to `main` (Render)

---

*Last updated: May 20, 2026 - Auto-deploy test*
