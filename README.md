# Trader CRM

A simple web app to manage your client list (grouped by city) and track order
history, amounts spent, and profit per order, client, and city.

## Features

- Add/edit/delete clients with name, city, phone, address, notes
- Filter and search clients by city or name
- Record orders per client with purchase amount, sale amount, and date
- Automatic profit calculation (sale amount - purchase amount) per order, client, and city
- Dashboard with totals: clients, orders, total sales, total profit, breakdown by city

## Getting Started

```bash
npm install
# create a .env.local with your own Postgres connection string, e.g.:
# DATABASE_URL="postgres://user:password@host/db?sslmode=require"
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data storage

Data is stored in a Postgres database. In production (Vercel), this is
provisioned via the Neon Postgres storage integration, which sets the
`DATABASE_URL` environment variable automatically. For local development,
point `DATABASE_URL` at your own Postgres database (the same Neon database
works fine too).

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM with Postgres (node-postgres driver adapter)
