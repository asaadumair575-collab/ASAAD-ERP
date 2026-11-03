# Store operations app

Multi-store SaaS for online sellers: Shopify orders, courier booking and tracking
(PostEx, Leopards, TCS), inventory, customers, COD reconciliation and profit.

- `/login` — store owners and their team.
- `/admin` — you: create store accounts, give demo access for N days, extend, pause or delete.

## Setup

1. Copy `.env.example` to `.env` and fill it in (Vercel: Project → Settings → Environment Variables).
2. `npm install` then `npm run build` — runs database migrations (into the `saas` schema) and builds.
3. Open `/admin/login` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (creates the first admin).

## Shopify

One-click connect needs a Shopify app (Shopify Dev Dashboard): set its redirect URL to
`$APP_URL/api/shopify/callback` and put its client ID / secret in `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`.
Without it, stores can still connect by pasting an Admin API access token.

## Couriers

Each store connects its own courier accounts on the Integrations page:

- **PostEx** — API token + pickup address code.
- **Leopards** — API key + API password.
- **TCS** — API client ID, username, password, cost center, pickup city. Verify against a real TCS
  account before going live; TCS does not publish its API documentation.

Demo accounts (created with sample data) use a simulated **Demo Courier**.
