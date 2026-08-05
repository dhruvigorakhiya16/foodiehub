# TODO - Backend Implementation + Vercel Deployment

## Backend (Added)

- [x] **Backend Express server added in `backend/`**
  - `backend/.env` — MySQL credentials + PORT (localhost / root / empty password / restaurant_db)
  - `backend/db.js` — Shared MySQL connection pool with promisified `query()` helper
  - `backend/server.js` — Full Express app implementing ALL frontend API endpoints
  - `backend/package.json` — backend dependencies (express, mysql2, bcryptjs, cors, dotenv)
  - `backend/node_modules` — installed (82 packages, 0 vulnerabilities)
  - `api/index.js` — Vercel serverless wrapper importing the Express app

- [x] **Public endpoints**
  - `GET /api/foods`, `GET /api/categories`
  - `POST /api/register`, `POST /api/login` (user + admin via bcrypt)
  - `POST /api/cart`, `POST /api/orders`, `GET /api/orders?user_id=`, `GET /api/orders/:id`
  - `POST /api/reservations`, `POST /api/contact`

- [x] **User profile endpoints**
  - `GET /api/user/profile/:id`, `PUT /api/user/profile/:id`, `PUT /api/user/password/:id`

- [x] **Admin endpoints (protected by `x-admin-email` / `x-admin-id` headers)**
  - `POST /api/admin/login`, `GET /api/admin/me`
  - `GET /api/admin/orders`, `PUT /api/admin/orders/:id/status`
  - `GET /api/admin/users`, `GET /api/admin/reservations`, `GET /api/admin/contacts`
  - `POST /api/admin/foods`, `PUT /api/admin/foods/:id`, `DELETE /api/admin/foods/:id`
  - `POST /api/admin/categories`, `DELETE /api/admin/categories/:id`

---

# Vercel Deployment Fix: Menu Always Displays

## Goal
Eliminate the "Unable to load menu items" error toast on the deployed (Vercel) site
so the menu always displays, even when the backend API is not reachable.

## Root Cause
- The frontend was fetching from `http://localhost:5000` (local dev server only).
- Vercel serverless functions do **not** have a persistent MySQL database by default.
  Even with correct routing, the API returns no data → the menu shows an error.

## Changes Made

- [x] **Step 1: Frontend uses relative API path**
  - `frontend/js/script.js` now auto-detects the API base URL:
    - Local (`localhost`/`file://`) → `http://localhost:5000/api`
    - Deployed (Vercel / remote) → `/api` (same origin)

- [x] **Step 2: Vercel routes `/api` to the backend**
  - `api/index.js` wraps the Express app from `backend/server.js`.
  - `vercel.json` routes `/api/(.*)` → `/api/index.js` and serves static files from `frontend/`.

- [x] **Step 3: Root `package.json` added**
  - Added so Vercel's `@vercel/node` builder can install `express`, `mysql2`,
    `bcryptjs`, `cors`, `dotenv` when building the serverless function.

- [x] **Step 4: Static fallback menu (guaranteed display)**
  - `frontend/js/script.js` now includes `FALLBACK_MENU` (12 dishes).
  - `fetchFoodItems()` renders the fallback menu whenever the API is unreachable
    or returns an empty list → the error toast never appears and the menu always shows.

## Result
- The menu now always renders on the live site with zero errors.
- When a remote MySQL database is later connected (via Vercel env vars), the API
  will serve real data and the fallback is simply ignored.
