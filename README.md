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
npx prisma migrate deploy   # creates the local SQLite database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data storage

All data is stored locally in a SQLite database file (`dev.db`) at the project
root. No internet connection or external service is required to use the app.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM with SQLite (better-sqlite3 driver adapter)
