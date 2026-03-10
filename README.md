# TradeBit

**Social trading built on top of [Wallbit](https://wallbit.io)'s public API.**

Share trades, follow traders, copy trades. All powered by real Wallbit accounts.

[![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify_5-000?logo=fastify)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)

> **Live demo:** [tradebit.franciscoberon.com](https://tradebit.franciscoberon.com) (demo mode with preloaded data)

---

## What is this?

TradeBit adds a social layer on top of Wallbit's existing banking and trading API. Users register on TradeBit, link their Wallbit account via API key, and unlock social features: a feed with embedded trades, a follow graph, public profiles with performance tracking, and one-click copy trading that executes real orders through Wallbit.

This project was built as a technical showcase.

---

## The Problem: Gaps in the API

While building on Wallbit's API, I identified several opportunities where native support would unlock an ecosystem of social and fintech apps. TradeBit addresses three of them:

### 1. No OAuth / Social Login

Wallbit's API doesn't provide a way for third-party apps to connect user accounts via OAuth. There's no authorization flow, no scoped tokens, no consent screen.

**TradeBit's approach:** Users link their Wallbit API key manually. The key is validated against Wallbit's API on connect, then encrypted with **AES-256-GCM** and stored in a vault (encrypted key + IV + auth tag). A HMAC-SHA256 hash prevents the same key from being linked to multiple accounts. The raw key is never exposed to the frontend. All Wallbit API calls are proxied through the backend, which decrypts the key server-side only when needed.

This is the same pattern used by platforms like 3Commas and Shrimpy with crypto exchanges. It works, but a native OAuth flow from Wallbit would be a better UX and security story.

### 2. No Portfolio Performance Tracking

The API exposes current positions but no historical data. There's no way to see how a user's portfolio has evolved over time, compute returns, or show YTD performance.

**TradeBit's approach:** A **snapshot system** that periodically captures portfolio state:

- An initial snapshot is taken (fire-and-forget) when a user connects their Wallbit account
- A cron endpoint (`POST /internal/snapshots`, protected by `CRON_SECRET`) iterates over all connected users, decrypts each key, fetches their stock positions from Wallbit, sums the `usdBalance` across positions, and upserts a daily snapshot (one per user per day)
- Profile views compute performance by comparing snapshots across time windows (1D, 1W, 1M, YTD), returning % change for each period
- Only stock portfolio value is tracked (not checking account cash), giving a clean measure of investment performance

If Wallbit exposed a historical portfolio value endpoint or a daily returns series, this entire subsystem wouldn't be necessary.

### 3. No Social Features

There's no concept of public profiles, following other users, or sharing trading activity. The API is purely transactional.

**TradeBit's approach:** Built the entire social layer from scratch: user profiles with stats (followers, following, post count, performance), a follow graph with a chronological feed, posts with embedded trade data (ticker, action, amount, live price), emoji reactions, and copy trading that executes the same trade on the copier's Wallbit account.

These three gaps represent product opportunities. If Wallbit added OAuth, a performance/history endpoint, and basic social primitives, it would enable a whole class of fintech and social trading apps on top of its API.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Monorepo | **Turborepo** + pnpm workspaces | Shared types, single `pnpm dev` for everything |
| Frontend | **Next.js 16** (App Router) + React 19 | Server Components, streaming, file-based routing |
| Styling | **Tailwind CSS 4** + shadcn/ui (Radix) | Rapid iteration, consistent design system |
| Backend | **Fastify 5** + TypeScript | High performance, schema validation, plugin ecosystem |
| ORM | **Drizzle ORM** | Type-safe, SQL-first, lightweight |
| Database | **PostgreSQL** (Neon serverless) | Managed Postgres, zero config, free tier |
| Validation | **Zod** (shared package) | Same schemas on frontend and backend |
| Auth | Custom **JWT** + **bcrypt** | Access tokens (15min) + refresh tokens (7d, httpOnly cookie) |
| Encryption | **AES-256-GCM** | Industry standard for API keys at rest |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 16    │────▶│   Fastify API   │────▶│  Wallbit API    │
│   (apps/web)    │     │   (apps/api)    │     │  (wallbit.io)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   PostgreSQL    │
                        │   (Neon)        │
                        └─────────────────┘
```

**Monorepo structure:**

```
tradebit/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/(auth)/         # Login, register, connect Wallbit
│   │   ├── app/(main)/         # Feed, profiles (with navbar + sidebar)
│   │   ├── components/         # Feed, profile, layout, UI components
│   │   ├── hooks/              # useAuth, useFeed, useCopyTrade
│   │   └── lib/                # API client, auth helpers, utils
│   └── api/                    # Fastify backend
│       └── src/
│           ├── modules/
│           │   ├── auth/       # Register, login, JWT, refresh tokens
│           │   ├── wallbit/    # Key vault, portfolio proxy, snapshots
│           │   ├── posts/      # Feed, CRUD, trade embeds
│           │   ├── social/     # Follows, profiles, performance calc
│           │   └── copy-trade/ # Trade execution, history
│           ├── db/             # Drizzle schema, migrations, seed
│           └── infra/          # Server bootstrap, middleware, database
└── packages/
    └── shared/                 # Types, constants, Zod validators
```

**Key patterns:**

- **API Key Vault:** Wallbit keys are encrypted (AES-256-GCM) at rest. Decryption happens server-side only when proxying a request to Wallbit. The frontend never sees raw keys.
- **Proxy pattern:** All Wallbit API calls go through the backend. The frontend calls TradeBit's API, which decrypts the user's key and forwards the request to Wallbit.
- **Snapshot cron:** A protected endpoint iterates over all valid keys, fetches portfolios, and upserts daily snapshots for performance tracking.

---

## Features

- **Social Feed** with cursor-based infinite scroll, trade embeds (ticker, price, action, amount, % change), and emoji reactions
- **Follow System** with follower/following counts, chronological feed filtered by follow graph
- **Copy Trading** with confirmation modal, amount input, and real order execution through Wallbit's API
- **API Key Vault** using AES-256-GCM encryption, HMAC-SHA256 deduplication, and server-side-only decryption
- **Portfolio Snapshots** with daily captures, upsert logic, and performance calculation (1D / 1W / 1M / YTD)
- **User Profiles** with stats, performance badges, trade history, and portfolio summary
- **Auth System** with bcrypt password hashing, short-lived JWTs, httpOnly refresh cookies, and rate limiting
- **Demo Mode** with auto-login, seed data, and mocked Wallbit responses for showcasing without real API keys

---

## Run Locally

**Prerequisites:** Node.js >= 20, pnpm

```bash
# Clone and install
git clone <repo-url>
cd tradebit
pnpm install

# Configure environment
cp .env.example .env
# Fill in:
#   DATABASE_URL    — Neon Postgres connection string
#   JWT_SECRET      — random 64-char string
#   JWT_REFRESH_SECRET — random 64-char string
#   ENCRYPTION_KEY  — 32-byte hex string (64 hex chars)

# Push database schema
pnpm --filter @tradebit/api db:push

# Seed demo data (optional)
pnpm --filter @tradebit/api db:seed

# Start both frontend (:3000) and backend (:3001)
pnpm dev
```

**Environment variables** (see [.env.example](.env.example)):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | Secret for access token signing |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing |
| `ENCRYPTION_KEY` | 32-byte hex string for AES-256-GCM vault |
| `WALLBIT_API_BASE_URL` | Wallbit API base URL (`https://api.wallbit.io/v1`) |
| `FRONTEND_URL` | Frontend origin for CORS (`http://localhost:3000`) |
| `API_PORT` | Backend port (default `3001`) |
| `DEMO_MODE` | Set to `true` to run with mocked Wallbit responses |

---

## Live Demo

A live instance is running at **[tradebit.franciscoberon.com](https://tradebit.franciscoberon.com)** in demo mode with preloaded users, posts, and trades. No real Wallbit API key required.
