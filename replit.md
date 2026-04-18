# Workspace

## Overview

NexusProxy — a production-ready SaaS proxy service platform. Users pay in crypto (Bitcoin, USDT TRC20, USDC) for residential/datacenter/mobile proxy access with automated subscription expiry, bandwidth tracking, admin panel, and user dashboard.

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Wouter + TanStack Query + Clerk auth + Tailwind + Framer Motion + Shadcn UI
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (appId: app_3CWhpyEomlj5dZEkCumj9ar0tCz)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild

## Artifacts

- `artifacts/nexusproxy` — Frontend web app at `/nexusproxy`
- `artifacts/api-server` — Backend Express API server

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema (7 tables)

- `users` — Clerk-synced users (id = Clerk userId string), role: "user" | "admin"
- `plans` — subscription plans (id is varchar string like "plan_starter")
- `proxies` — proxy credentials (ip, port, username, password, proxyType, country)
- `payments` — crypto payment records (currency: BTC/USDT_TRC20/USDC, status: pending/confirmed/failed)
- `subscriptions` — user subscriptions (status: active/expired/cancelled)
- `user_proxies` — junction: which proxies are assigned to which subscriptions
- `usage_logs` — bandwidth/connection usage tracking

## Seeded Data

- 4 plans: Daily Starter ($2), Starter ($10), Pro ($40), Business ($120)
- 5 demo proxies: 2x residential (US, DE), 2x datacenter (UK, FR), 1x mobile (US)

## Important Notes

- **Crypto wallets**: Addresses in `artifacts/api-server/src/lib/crypto-wallets.ts` are placeholders. Set WALLET_BTC, WALLET_USDT_TRC20, WALLET_USDC secrets for real payments.
- **Admin role**: Promote first user via SQL: `UPDATE users SET role='admin' WHERE email='terry4white1956@gmail.com'`
- **Payment flow**: Manual — user submits tx hash, admin confirms in admin panel → subscription activates → proxies assigned
- **Expiry job**: Runs every 5 minutes, expires subscriptions and revokes proxy access
- **Base path**: `/nexusproxy` — all routing uses `import.meta.env.BASE_URL`
- **priceUsd**: Stored in cents (divide by 100 to display)

## Frontend Pages

- `/` — Public landing page (marketing)
- `/sign-in` `/sign-up` — Clerk auth pages (dark themed)
- `/dashboard` — Active subscription, bandwidth, quick proxy overview
- `/plans` — All pricing plans from DB with Buy Now CTA
- `/payment` — Crypto payment flow (BTC/USDT/USDC) with wallet + hash submit
- `/proxies` — My assigned proxies with copy-to-clipboard
- `/usage` — Bandwidth stats, expiry countdown
- `/admin` — Admin panel (Stats, Users, Payments, Proxies, Plans tabs)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
