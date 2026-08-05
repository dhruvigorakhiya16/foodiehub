# TODO - Render Deployment (Option B: All-in-One)

## Goal
Deploy the FULL Foodie Hub Restaurant site (frontend + backend API + PostgreSQL database)
on a single Render service so everything works from one URL.

## What was done

### Backend (PostgreSQL migration)
- [x] `backend/db.js` — PostgreSQL connection pool (supports `DATABASE_URL` from Render/Aiven)
- [x] `backend/setup-db.js` — creates ALL tables + seeds admin & food items
- [x] `backend/server.js` — full Express API (PostgreSQL) + serves root static frontend
- [x] `backend/package.json` — uses `pg` driver
- [x] `backend/index.js` — Vercel serverless wrapper

### Frontend asset fixes
- [x] Created `css/style.css` (copy of root `style.css`)
- [x] Created `js/script.js` (copy of root `script.js`)
- [x] HTML files reference `css/style.css` and `js/script.js` correctly

### Deployment config
- [x] `render.yaml` — Render Blueprint (web service + free PostgreSQL DB)
- [x] `vercel.json` — routes `/api` to serverless function, serves static from root
- [x] Root `package.json` — full-stack deps for Render/Vercel
- [x] `.gitignore` — excludes `node_modules`, `.env`, logs
- [x] `api/index.js` — Vercel serverless entry point

## ⚠️ LIVE SITE FIX REQUIRED (Render Dashboard) — CONFIRMED 2026-08-05

The backend code is **complete and correct** and the frontend is being served (all HTML pages return 200).
The ONLY remaining issue is that the Render **web service has NO database connection**:

Diagnosis from `https://foodie-hub-1-2qag.onrender.com/api/debugdb`:
```
env: DATABASE_URL -> false, DB_HOST -> (unset), PGHOST -> (unset)
connectionConfig: host -> localhost, port -> 5432  (falls back to localhost!)
connectionCode: ECONNREFUSED
```

This means the Render web service was created **manually** (not from the `render.yaml` Blueprint),
so the `DATABASE_URL` env var pointing to the Postgres database was NEVER injected.

### THE FIX (requires Render dashboard access — cannot be done from code)
On Render → your `foodie-hub` Web Service → **Environment** tab, add:
- `DATABASE_URL` = the connection string of the `foodiehub-db` Postgres database
  (Render lists it under the database's **Connections** panel, "Internal Database URL")
- `DATABASE_SSL` = `true` (Render Postgres requires SSL)

Then **Deploy** (or the service auto-redeploys on new pushes). The app auto-creates all
tables + seed data on boot, so once `DATABASE_URL` is set, `/api/foods` returns the menu.

> If you instead want the DB to be fully managed by the blueprint, delete the manual
> web service and re-deploy via **New → Blueprint** so `render.yaml` wires up the database.

## How to deploy on Render (Blueprint)

1. Push this repo to GitHub (ensure `backend/.env` is NOT committed — it's gitignored).
2. Go to https://render.com → **New** → **Blueprint** → connect your GitHub repo.
3. Render reads `render.yaml` and creates:
   - A **PostgreSQL database** (`foodiehub-db`, free tier)
   - A **Web Service** (`foodie-hub`) that runs `node backend/server.js`
4. Render automatically injects `DATABASE_URL` into the web service from the DB.
   The DB schema is created manually once (step 5 below) OR via a one-time command.
5. After the service deploys, run the DB setup once so tables + seed data exist:
   - Go to the web service → **Shell** tab (or use the Render **one-off job**):
     `node backend/setup-db.js`

## Admin credentials (seeded)
- Email: `adminfoodiehub@gmail.com`
- Password: `admin1234`

## Local run
1. `npm install`
2. Have a local PostgreSQL running, set connection in `backend/.env`
3. `node backend/setup-db.js` (creates tables + seeds)
4. `node backend/server.js` → visit `http://localhost:5000`
