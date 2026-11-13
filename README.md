# TikTak Real Estate — Stage 7 (Backend foundation)

Iyi package ikomeza frontend ya Stage 6 kandi ikongeramo API backend ya Node.js/Express, PostgreSQL na Prisma.

## Ibyo Stage 7 itangiriraho
- User registration/login na JWT; password zibikwa zikoresheje bcrypt hash.
- Roles: ADMIN, AGENT, BUYER, SELLER.
- Listings: gutangaza, kureba ibyemejwe, kureba ibyawe, no kwemeza/guhagarika nka Admin.
- Deals: gutangiza offer, gukurikirana status, kubara commission ya 5%.
- Admin overview, users na commission; kwandika ubwishyu nyuma yo kubugenzura.
- Helmet, CORS, rate limiting, input validation.

## Ibisabwa
- Node.js 20+
- PostgreSQL 14+

## Gutangiza backend
1. Fungura terminal muri `backend/`.
2. Kora `npm install`.
3. Koporora `.env.example` uyite `.env`, uhindure `DATABASE_URL` na `JWT_SECRET`.
4. Kora database `tiktak_real_estate` muri PostgreSQL.
5. Kora `npm run db:generate`.
6. Kora `npm run db:migrate -- --name init`.
7. Tangiza server ukoresheje `npm run dev`.
8. Reba `http://localhost:4000/api/health`.

## Gukora Admin wa mbere
Ongeramo ibi muri `.env` mbere yo gukoresha seed:
```
ADMIN_NAME="TikTak Admin"
ADMIN_CONTACT="admin@example.com"
ADMIN_PASSWORD="ChangeThisStrongPassword123!"
```
Hanyuma ukoreshe `npm run db:seed`. Ntukoreshe password y'urugero kuri production.

## API routes
- `POST /api/auth/register` — `{fullName,country,contact,password}`
- `POST /api/auth/login` — `{contact,password}`
- `GET /api/auth/me` — Bearer token
- `GET /api/listings` — public approved listings; filters: `country`, `type`, `location`
- `POST /api/listings` — SELLER/AGENT/ADMIN
- `GET /api/listings/mine` — authenticated
- `PATCH /api/listings/:id/status` — ADMIN
- `POST /api/deals` — BUYER/ADMIN `{listingId,price}`
- `GET /api/deals` — user's deals or all for ADMIN
- `PATCH /api/deals/:id/status` — ADMIN
- `GET /api/admin/overview`, `/users`, `/commissions` — ADMIN
- `PATCH /api/admin/commissions/:id/paid` — ADMIN `{reference}` after manual payment verification

## Stage 7A — Frontend/API integration
- `frontend/api.js` ni API client ihuriweho; default API URL ni `http://localhost:4000/api` (ushobora kuyihindura muri browser localStorage key `tiktak-api-base`).
- Registration/login bihuzwa na API kandi JWT ibikwa muri browser localStorage.
- Abiyandikisha bahitamo BUYER cyangwa SELLER; ntibashobora kwigenera ADMIN/AGENT.
- Listing submission yoherezwa kuri API kandi igatangira status ya PENDING.
- Homepage ikurura gusa listings zemejwe na Admin.
- Admin dashboard, deals, messages, image uploads na payment gateway biracyari mu byiciro bizakurikiraho. Ubu backend foundation irateguwe ariko ntiratangizwa kuri server yawe, kandi database credentials ntizashyizwe muri ZIP.

Nta payment gateway cyangwa Cloudinary integration irimo; ntitwemeza ko amafaranga yishyuwe keretse Admin amaze kugenzura reference.


## Gukoresha frontend ihujwe na API
1. Tangiza backend ukoresheje amabwiriza ari hejuru.
2. Fungura `frontend/` muri VS Code, ukoreshe Live Server kuri `http://localhost:5500` (cyangwa uhindure `CLIENT_ORIGIN` muri `.env` ijyane n'aho uyitangirije). Ntukayifungure ukoresheje `file://`.
3. Fungura `http://localhost:5500/index.html`.
4. Niba API iri ku yindi URL, muri browser developer console shyiramo `localStorage.setItem('tiktak-api-base','https://api.urubuga-rwawe.com/api')` hanyuma wongere ufungure page.
5. Kuri registration, hitamo SELLER niba ushaka gutangaza umutungo; BUYER ntashobora kohereza listings.

**Imipaka y'iyi milestone:** Amafoto/video ntibirakorwa kandi byahagaritswe ku ifishi kugira ngo bitange amakuru atari yo. Admin dashboard iracyakoresha demo data; kuyihuza na API ni intambwe ikurikira.


## Stage 7B – Admin dashboard integration

The admin Listings and Clients screens now read and update live PostgreSQL data through the protected `/api/admin` endpoints. Sign in with an account whose role is `ADMIN`, then open `frontend/admin.html`.

New admin endpoints:
- `GET /api/admin/listings` – list all listings with seller details.
- `PATCH /api/admin/listings/:id/status` – set `PENDING`, `APPROVED`, `REJECTED`, `PAUSED`, or `SOLD`.
- `GET /api/admin/users` – list users.
- `PATCH /api/admin/users/:id/active` – enable or disable a user account.

All these endpoints require a valid JWT and the `ADMIN` role. The admin frontend loads `api.js` before `admin.js`; configure the API base URL with the `tiktak-api-base` localStorage setting if the API is hosted somewhere other than `http://localhost:4000/api`.


## Stage 7C — Cloudinary property photos

- Cloudinary SDK + secure server-side uploads.
- SELLER/AGENT can upload photos to their own listings; ADMIN can upload to any listing.
- Maximum 10 images per listing, JPG/PNG/WEBP/AVIF, maximum 10 MB each.
- Image URLs and Cloudinary public IDs/metadata are stored in PostgreSQL (`ListingImage`).
- Public approved listings return their image gallery; homepage shows the first image.
- Admin image endpoints: `GET /api/admin/images` and `DELETE /api/admin/images/:id`.
- Upload endpoint: `POST /api/listings/:id/images`, multipart form-data field `images`.

### Setup
1. In `backend/`, run `npm install`.
2. Copy `.env.example` to `.env`.
3. Put your Cloudinary Cloud Name, API Key and API Secret in `.env`. Never commit `.env` or share the API Secret.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate -- --name add_listing_images`.
6. Start with `npm run dev`, then open the frontend with Live Server.
7. Sign in as SELLER, create a listing, select photos and submit. Admin approval is still required before the listing and photos appear publicly.

Video uploads and a visual admin gallery screen are not included in this milestone; the protected admin list/delete API is available.
