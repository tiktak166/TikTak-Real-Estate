# TikTak Real Estate — Stage 7C (Cloudinary + Live Admin)

TikTak Real Estate is a local-development real-estate marketplace for land, houses and cars in Rwanda and Kenya. The project contains a static frontend, an Express API, PostgreSQL and Prisma, JWT authentication, Cloudinary image storage, customer messaging and an Admin dashboard.

## Features

- Public homepage shows only listings approved by Admin; supports category, country and location filtering.
- Registration and login with BUYER / SELLER roles; password hashes use bcrypt and sessions use JWT.
- SELLER / AGENT / ADMIN can submit listings; listing photos upload securely to Cloudinary (up to 10 images, 10 MB each; JPG, PNG, WEBP and AVIF).
- Admin can review listings, manage customers, view offers/deals, read and reply to customer messages, and manage listing photos.
- Buyers can submit offers and view their own deals and messages in the customer dashboard.
- Admin advances deals through negotiation and sale agreement. A listing becomes SOLD only when a deal is marked SALE_COMPLETED.
- TikTak's 5% commission is created only when a sale is completed. Admin records a payment reference only after verifying receipt independently; no payment gateway is integrated.
- Favorites are stored in the customer's browser and displayed in the customer dashboard.
- Security middleware includes Helmet, CORS, API rate limiting, input validation and role-based authorization.

## Requirements

- Node.js 20 or newer (the project has also been used with Node.js 26).
- PostgreSQL 14 or newer.
- A Cloudinary account for image uploads.

## Backend setup

1. Open a terminal in `backend/`.
2. Run `npm.cmd install` in Windows PowerShell (or `npm install` in other shells).
3. Copy `.env.example` to `.env` and set `DATABASE_URL`, a long random `JWT_SECRET`, Cloudinary credentials and Admin seed credentials.
4. Create the PostgreSQL database named `tiktak_real_estate` (or adjust `DATABASE_URL`).
5. Run `npm.cmd run db:generate`.
6. For a new database, run `npm.cmd run db:migrate -- --name init`. For an existing Stage 7C database that is already migrated, do not rerun an initial migration; use `npm.cmd run db:generate` only unless a new schema migration is explicitly supplied.
7. Run `npm.cmd run db:seed` once to create/update the Admin account using `ADMIN_CONTACT` and `ADMIN_PASSWORD` from `.env`.
8. Start the API with `npm.cmd run dev`.
9. Confirm `http://localhost:4000/api/health` returns `{ "status": "ok" }`.

## Frontend setup

1. Open a second terminal in `frontend/`.
2. Start the static server, for example:
   `npx.cmd --yes http-server . -p 5501 -c-1`
3. Keep both backend and frontend terminals running.
4. Open `http://127.0.0.1:5501/index.html`.
5. Sign in to the Admin account at `account.html#login`; after login an ADMIN is redirected to `admin.html`.

In development, the API allows localhost and 127.0.0.1 origins on local ports when `NODE_ENV` is not `production`. For deployment, set `CLIENT_ORIGIN` to the exact HTTPS frontend origin(s).

## Environment variables

See `backend/.env.example`. Never put the real `.env` file in a ZIP, source control or a public chat. Do not share `JWT_SECRET` or `CLOUDINARY_API_SECRET`.

## Main API routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/listings`, `POST /api/listings`, `GET /api/listings/mine`
- `POST /api/listings/:id/images`
- `POST /api/deals`, `GET /api/deals`, `PATCH /api/deals/:id/status`
- `POST /api/messages`, `GET /api/messages/mine`, `GET /api/messages` (Admin), `POST /api/messages/:userId/reply` (Admin)
- `GET /api/admin/overview`, `/listings`, `/users`, `/commissions`, `/images`
- `PATCH /api/admin/listings/:id/status`, `PATCH /api/admin/users/:id/active`
- `PATCH /api/admin/commissions/:id/paid`, `DELETE /api/admin/images/:id`

All Admin routes require a valid JWT for an active ADMIN account.

## Before production deployment

- Rotate the Cloudinary API secret that was previously exposed during development; rotate `JWT_SECRET` too if it was exposed.
- Use a production database, backups, HTTPS, monitoring and server-side logs.
- Set `NODE_ENV=production` and restrict `CLIENT_ORIGIN` to the real frontend domain.
- Keep `.env`, database dumps, credentials and tokens private.
- A payment gateway is not included. Do not mark a commission PAID until the transfer has been independently verified.
