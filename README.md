# TradeBit

**Social trading construido sobre la API publica de [Wallbit](https://wallbit.io).**

Comparte trades, segui traders, copia trades. Todo impulsado por cuentas reales de Wallbit.

[![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify_5-000?logo=fastify)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)

> **Demo en vivo:** [tradebit.franciscoberon.com](https://tradebit.franciscoberon.com) (modo demo con datos precargados)

---

## Que es esto?

TradeBit agrega una capa social sobre la API existente de banking y trading de Wallbit. Los usuarios se registran en TradeBit, vinculan su cuenta de Wallbit via API key, y desbloquean features sociales: un feed con trades embebidos, un grafo de follows, perfiles publicos con tracking de rendimiento, y copy trading con un click que ejecuta ordenes reales a traves de Wallbit.

Este proyecto fue construido como showcase tecnico.

---

## El Problema: Gaps en la API

Mientras construia sobre la API de Wallbit, identifique varias oportunidades donde el soporte nativo habilitaria un ecosistema de apps sociales y fintech. TradeBit aborda tres de ellas:

### 1. Sin OAuth / Social Login

La API de Wallbit no provee una forma para que apps de terceros conecten cuentas de usuario via OAuth. No hay flujo de autorizacion, ni tokens con scope, ni pantalla de consentimiento.

**Approach de TradeBit:** Los usuarios vinculan su API key de Wallbit manualmente. La key se valida contra la API de Wallbit al conectar, luego se encripta con **AES-256-GCM** y se almacena en un vault (key encriptada + IV + auth tag). Un hash HMAC-SHA256 previene que la misma key se vincule a multiples cuentas. La key raw nunca se expone al frontend. Todas las llamadas a la API de Wallbit se proxean a traves del backend, que desencripta la key server-side solo cuando es necesario.

Este es el mismo patron que usan plataformas como 3Commas y Shrimpy con exchanges de crypto. Funciona, pero un flujo OAuth nativo de Wallbit seria una mejor historia de UX y seguridad.

### 2. Sin Tracking de Rendimiento del Portfolio

La API expone posiciones actuales pero no datos historicos. No hay forma de ver como evoluciono el portfolio de un usuario a lo largo del tiempo, calcular retornos, o mostrar rendimiento YTD.

**Approach de TradeBit:** Un **sistema de snapshots** que captura periodicamente el estado del portfolio:

- Un snapshot inicial se toma (fire-and-forget) cuando el usuario conecta su cuenta de Wallbit
- Un endpoint cron (`POST /internal/snapshots`, protegido por `CRON_SECRET`) itera sobre todos los usuarios conectados, desencripta cada key, obtiene sus posiciones de acciones de Wallbit, suma el `usdBalance` de las posiciones, y hace upsert de un snapshot diario (uno por usuario por dia)
- Las vistas de perfil calculan rendimiento comparando snapshots en ventanas de tiempo (1D, 1W, 1M, YTD), retornando el % de cambio por cada periodo
- Solo se trackea el valor del portfolio de acciones (no el cash de la cuenta), dando una medida limpia del rendimiento de inversiones

Si Wallbit expusiera un endpoint de valor historico del portfolio o una serie de retornos diarios, todo este subsistema no seria necesario.

### 3. Sin Features Sociales

No existe concepto de perfiles publicos, seguir otros usuarios, o compartir actividad de trading. La API es puramente transaccional.

**Approach de TradeBit:** Se construyo la capa social completa desde cero: perfiles de usuario con stats (followers, following, cantidad de posts, rendimiento), un grafo de follows con feed cronologico, posts con datos de trade embebidos (ticker, accion, monto, precio en vivo), reacciones con emojis, y copy trading que ejecuta el mismo trade en la cuenta de Wallbit del copiador.

Estos tres gaps representan oportunidades de producto. Si Wallbit agregara OAuth, un endpoint de rendimiento/historial, y primitivas sociales basicas, habilitaria toda una clase de apps fintech y de social trading sobre su API.

---

## Tech Stack

| Capa | Tecnologia | Por que |
|------|-----------|---------|
| Monorepo | **Turborepo** + pnpm workspaces | Tipos compartidos, un solo `pnpm dev` para todo |
| Frontend | **Next.js 16** (App Router) + React 19 | Server Components, streaming, routing basado en archivos |
| Styling | **Tailwind CSS 4** + shadcn/ui (Radix) | Iteracion rapida, design system consistente |
| Backend | **Fastify 5** + TypeScript | Alto rendimiento, validacion de schemas, ecosistema de plugins |
| ORM | **Drizzle ORM** | Type-safe, SQL-first, liviano |
| Database | **PostgreSQL** (Neon serverless) | Postgres gestionado, zero config, tier gratuito |
| Validacion | **Zod** (paquete compartido) | Mismos schemas en frontend y backend |
| Auth | Custom **JWT** + **bcrypt** | Access tokens (15min) + refresh tokens (7d, httpOnly cookie) |
| Encriptacion | **AES-256-GCM** | Estandar de industria para API keys en reposo |

---

## Arquitectura

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

**Estructura del monorepo:**

```
tradebit/
├── apps/
│   ├── web/                    # Frontend Next.js
│   │   ├── app/(auth)/         # Login, registro, conectar Wallbit
│   │   ├── app/(main)/         # Feed, perfiles (con navbar + sidebar)
│   │   ├── components/         # Componentes de feed, perfil, layout, UI
│   │   ├── hooks/              # useAuth, useFeed, useCopyTrade
│   │   └── lib/                # Cliente API, helpers de auth, utils
│   └── api/                    # Backend Fastify
│       └── src/
│           ├── modules/
│           │   ├── auth/       # Registro, login, JWT, refresh tokens
│           │   ├── wallbit/    # Key vault, proxy de portfolio, snapshots
│           │   ├── posts/      # Feed, CRUD, trade embeds
│           │   ├── social/     # Follows, perfiles, calculo de rendimiento
│           │   └── copy-trade/ # Ejecucion de trades, historial
│           ├── db/             # Schema Drizzle, migraciones, seed
│           └── infra/          # Bootstrap del server, middleware, database
└── packages/
    └── shared/                 # Tipos, constantes, validadores Zod
```

**Patrones clave:**

- **API Key Vault:** Las keys de Wallbit se encriptan (AES-256-GCM) en reposo. La desencriptacion ocurre server-side solo al proxear un request a Wallbit. El frontend nunca ve keys raw.
- **Patron proxy:** Todas las llamadas a la API de Wallbit pasan por el backend. El frontend llama a la API de TradeBit, que desencripta la key del usuario y forwardea el request a Wallbit.
- **Snapshot cron:** Un endpoint protegido itera sobre todas las keys validas, obtiene portfolios, y hace upsert de snapshots diarios para tracking de rendimiento.

---

## Features

- **Feed Social** con infinite scroll basado en cursor, trade embeds (ticker, precio, accion, monto, % cambio), y reacciones con emojis
- **Sistema de Follows** con contadores de followers/following, feed cronologico filtrado por grafo de follows
- **Copy Trading** con modal de confirmacion, input de monto, y ejecucion real de ordenes a traves de la API de Wallbit
- **API Key Vault** usando encriptacion AES-256-GCM, deduplicacion HMAC-SHA256, y desencriptacion solo server-side
- **Snapshots de Portfolio** con capturas diarias, logica de upsert, y calculo de rendimiento (1D / 1W / 1M / YTD)
- **Perfiles de Usuario** con stats, badges de rendimiento, historial de trades, y resumen de portfolio
- **Sistema de Auth** con hashing de passwords bcrypt, JWTs de corta duracion, refresh cookies httpOnly, y rate limiting
- **Modo Demo** con auto-login, datos seed, y respuestas mockeadas de Wallbit para showcase sin API keys reales

---

## Correr Localmente

**Prerequisitos:** Node.js >= 20, pnpm

```bash
# Clonar e instalar
git clone <repo-url>
cd tradebit
pnpm install

# Configurar entorno
cp .env.example .env
# Completar:
#   DATABASE_URL       - Connection string de Neon Postgres
#   JWT_SECRET         - String random de 64 caracteres
#   JWT_REFRESH_SECRET - String random de 64 caracteres
#   ENCRYPTION_KEY     - String hex de 32 bytes (64 chars hex)

# Pushear schema a la base de datos
pnpm --filter @tradebit/api db:push

# Seedear datos de demo (opcional)
pnpm --filter @tradebit/api db:seed

# Iniciar frontend (:3000) y backend (:3001)
pnpm dev
```

**Variables de entorno** (ver [.env.example](.env.example)):

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon Postgres |
| `JWT_SECRET` | Secret para firmar access tokens |
| `JWT_REFRESH_SECRET` | Secret para firmar refresh tokens |
| `ENCRYPTION_KEY` | String hex de 32 bytes para el vault AES-256-GCM |
| `WALLBIT_API_BASE_URL` | URL base de la API de Wallbit (`https://api.wallbit.io/v1`) |
| `FRONTEND_URL` | Origen del frontend para CORS (`http://localhost:3000`) |
| `API_PORT` | Puerto del backend (default `3001`) |
| `DEMO_MODE` | Setear en `true` para correr con respuestas mockeadas de Wallbit |

---

## Demo en Vivo

Una instancia live esta corriendo en **[tradebit.franciscoberon.com](https://tradebit.franciscoberon.com)** en modo demo con usuarios, posts y trades precargados. No se requiere API key real de Wallbit.

---
---

# TradeBit (English)

**Social trading built on top of [Wallbit](https://wallbit.io)'s public API.**

Share trades, follow traders, copy trades. All powered by real Wallbit accounts.

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
#   DATABASE_URL       - Neon Postgres connection string
#   JWT_SECRET         - random 64-char string
#   JWT_REFRESH_SECRET - random 64-char string
#   ENCRYPTION_KEY     - 32-byte hex string (64 hex chars)

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
