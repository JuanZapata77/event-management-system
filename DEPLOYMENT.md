# Deployment Guide

This project is a full-stack app with a React frontend, an Express backend, and PostgreSQL. The best production setup is:

- Frontend: Vercel
- Backend: Render or Railway
- Database: Neon or Supabase Postgres

Vercel is a good fit for the frontend only. The backend should run on a host that supports a long-lived Node server.

## 1. Database

Create a managed PostgreSQL database on Neon or Supabase.

Run the SQL from `database/schema.sql` and then the migration files in `database/migrations/` in order.

## 2. Backend deployment

Deploy the `backend/` folder to Render or Railway.

Required environment variables:

- `DB_USER`
- `DB_HOST`
- `DB_NAME`
- `DB_PASSWORD`
- `DB_PORT`
- `PORT`
- `CORS_ORIGIN`

Suggested `CORS_ORIGIN` value:

- Your Vercel frontend URL, for example `https://your-app.vercel.app`
- You can also keep localhost for development: `http://localhost:3000`

Start command:

- `npm start`

Important:

- The backend now uses `process.env.PORT`.
- CORS accepts a comma-separated list from `CORS_ORIGIN`.

## 3. Frontend deployment

Deploy the `frontend/` folder to Vercel.

Set this environment variable in Vercel:

- `REACT_APP_API_URL` = your backend URL, for example `https://your-backend.onrender.com`

Build command:

- `npm run build`

Output directory:

- `build`

## 4. Local development

Backend `.env` example:

- `DB_USER=...`
- `DB_HOST=...`
- `DB_NAME=...`
- `DB_PASSWORD=...`
- `DB_PORT=5432`
- `PORT=5000`
- `CORS_ORIGIN=http://localhost:3000`

Frontend `.env` example:

- `REACT_APP_API_URL=http://localhost:5000`

## 5. Recommended deployment order

1. Deploy the database.
2. Deploy the backend.
3. Deploy the frontend.
4. Update `REACT_APP_API_URL` and `CORS_ORIGIN`.
5. Redeploy frontend if the API URL changes.

## 6. What not to do

- Do not deploy the Express backend as a Vercel frontend-only app.
- Do not commit `node_modules`.
- Do not keep hardcoded localhost API URLs in production.
