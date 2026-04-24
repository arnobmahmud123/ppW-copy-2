# Property Preserve Pro

Property Preserve Pro is a Next.js, Prisma, and Tailwind application for managing property preservation work orders, messaging, bidding, invoicing, and support operations.

## Local development

This repository now expects PostgreSQL for both local and deployed environments.

1. Create a local Postgres database.
2. Set `DATABASE_URL` in `.env.local`.
3. Apply the Prisma migrations.
4. Start the app.

```bash
npm install
npm run db:migrate:deploy
npm run dev
```

## Local Postgres example

```bash
createdb ppw_web
```

```env
DATABASE_URL="postgresql://mdshumonmiah@localhost:5432/ppw_web?schema=public"
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="replace-me"
```

## Demo data

The repo includes Prisma-based seed scripts in `/prisma` plus a reusable bulk demo data loader in `/scripts/seed-demo-work-orders.js`.

## Vercel deployment

This app is prepared for a Vercel-friendly Postgres deployment flow:

- Prisma client is generated on install via `postinstall`
- Prisma migrations and demo data seeding run during `npm run build`
- The app expects a Postgres `DATABASE_URL`

If you need a compile-only build without touching the database, use:

```bash
npm run build:app
```

Before deploying, set these required environment variables in Vercel:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `APP_ENCRYPTION_KEY`

Optional provider and AI variables are documented in `.env.example`.
