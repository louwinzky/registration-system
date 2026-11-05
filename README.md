# School Registration System

Modular monolith with a **Registrar** module, a **Cashier** module and an **Admin** area.

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router) + TypeScript |
| Database / ORM | PostgreSQL 16 + Prisma |
| UI | Tailwind CSS + shadcn/ui (`components.json` included) |
| Auth | Auth.js v5 (credentials, JWT sessions, role-based access) |
| Validation | Zod (`src/lib/validation.ts`) |
| Reports | PDFKit official receipts (`/api/receipts/:paymentId`) |
| Payments | Cash, GCash and Maya (via PayMongo checkout + signed webhook) |
| Deploy | Docker / docker-compose |

## Structure

```
src/
  app/                 routes (login, registrar/, cashier/, admin/, api/)
  modules/
    registrar/         student registration, enrollment, fee snapshot
    cashier/           balances, payments, PayMongo adapter, receipt PDF
  lib/                 db, rbac, validation, utils
  auth.ts, auth.config.ts, middleware.ts
prisma/                schema.prisma, seed.ts
```

Modules talk through plain service functions (`modules/*`), never through each
other's tables directly from the UI, so a module can be split out later.

## Run locally (without Docker for the app)

```bash
cp .env.example .env            # then set AUTH_SECRET (npx auth secret)
docker compose up -d db         # PostgreSQL only
npm install
npx prisma migrate dev --name init
npm run db:seed                 # admin user + sample school year, grades, fees
npm run dev                     # http://localhost:3000
```

Default admin: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`.
**Change it after first login.**

## Run everything in Docker

```bash
cp .env.example .env
# 1. Create the first migration once (needs the DB from `docker compose up -d db`):
npm install && npx prisma migrate dev --name init
# 2. Build and start everything:
docker compose up -d --build
# 3. Seed from your machine (Postgres is published on localhost:5432):
npm run db:seed
```

Migrations are applied automatically on container start (`prisma migrate deploy`),
but only if `prisma/migrations/` exists, so run step 1 and commit that folder first.
The production image does not include `tsx`, which is why seeding runs from your machine.

## Online payments (GCash / Maya)

1. Create a PayMongo account and put the secret key in `PAYMONGO_SECRET_KEY`.
2. Register a webhook for `checkout_session.payment.paid` pointing to
   `https://<your-domain>/api/webhooks/paymongo` and put its secret in `PAYMONGO_WEBHOOK_SECRET`.
3. For local testing expose port 3000 with a tunnel (e.g. ngrok) and set `APP_BASE_URL`.

Flow: cashier opens checkout → payer completes GCash/Maya → provider calls the webhook →
signature verified → payment marked `PAID`, receipt number issued, enrollment becomes `ENROLLED`.
The webhook handler is idempotent. Check the adapter in
`src/modules/cashier/providers/paymongo.ts` against PayMongo’s current docs before production.
Swap providers by replacing that one file.

## Roles

| Role | Access |
|---|---|
| REGISTRAR | `/registrar` – register students, enroll, assign section |
| CASHIER | `/cashier` – collect cash / online, view payments, print receipts |
| ADMIN | everything + `/admin` – users, void payments (audited) |

Enforced in `middleware.ts` (route level) **and** `requireRole()` in layouts/server actions.

## Hosting online

Any Docker host works (VPS, Railway, Render, Fly.io). Requirements: HTTPS, a managed or
volume-backed PostgreSQL, `AUTH_SECRET` set, `AUTH_URL` = public URL, and `APP_BASE_URL` = public URL
so payment redirects and webhooks resolve.

## Next steps (not built yet)

- Installment plans / due dates, discounts and scholarships
- Daily collection report (PDF) and enrollment masterlist export
- Section assignment screens and class lists
- Password change / reset, login rate-limiting
- Automated tests for payments and balance logic
