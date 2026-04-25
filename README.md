# AR Buildwel · propertyserch

![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/license-private-lightgrey)

Monorepo for a **real-estate platform**: listings, buyer requirements, matching, deals, broker organizations, CRM (leads, notes, follow-ups), reviews, dashboards, and related flows.

The npm package name is **`ar-buildwel`**; this GitHub repo is commonly checked out as **`propertyserch`**.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Clone and install](#clone-and-install)
  - [Infrastructure](#infrastructure)
  - [Environment variables](#environment-variables)
  - [Database](#database)
  - [Run the apps](#run-the-apps)
- [Scripts](#scripts)
- [Production build](#production-build)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Features

- **Listings & requirements** — Post and browse properties and buyer requirements.
- **Matching & deals** — Match pipeline, deal stages, and deal detail flows.
- **Broker workspace** — Organizations, dashboard summary, CRM-style lead management.
- **Trust** — Reviews (including moderation-oriented flows where implemented).
- **Auth** — API uses JWT; local dev can use OTP-related settings (see `apps/api/.env.example`).

*Exact API routes and UI pages evolve with the codebase; see `apps/api/src` and `apps/web/src`.*

## Tech stack

| Area | Technology |
|------|------------|
| **Frontend** | [Next.js](https://nextjs.org/) 15 (App Router), React 19, TypeScript, [Tailwind CSS](https://tailwindcss.com/) |
| **Backend** | [NestJS](https://nestjs.com/) 11, TypeScript |
| **Database** | [PostgreSQL](https://www.postgresql.org/) 16 |
| **ORM** | [Prisma](https://www.prisma.io/) 6 |
| **Cache** | [Redis](https://redis.io/) (`ioredis` in the API) |
| **Search (local infra)** | Elasticsearch 8 (optional; defined in Docker Compose) |
| **Monorepo** | npm workspaces (`apps/*`, `packages/*`) |
| **Runtime** | Node.js **>= 20** |

Shared TypeScript code: **`packages/shared`** (`@ar-buildwel/shared`), built on `npm install` via `postinstall`.

## Repository layout

```
apps/
  api/     # NestJS REST API, Prisma schema & migrations
  web/     # Next.js web app
packages/
  shared/  # Shared package consumed by api/web
infra/
  docker-compose.yml   # Postgres, Redis, Elasticsearch
```

## Getting started

### Prerequisites

- **Node.js 20+** and npm  
- **Docker** (Desktop or Engine + Compose) for local Postgres / Redis / Elasticsearch

### Clone and install

```bash
git clone <your-repository-url>
cd propertyserch   # use the folder name GitHub shows after clone
npm install
```

`npm install` runs **`postinstall`**, which builds **`@ar-buildwel/shared`**.

### Infrastructure

```bash
npm run db:up
```

| Service | Host port | Notes |
|---------|------------|--------|
| PostgreSQL | **5433** | Mapped from container `5432` so a local Postgres on `5432` does not conflict |
| Redis | **6379** | |
| Elasticsearch | **9200** | Optional for local experimentation |

Credentials for Postgres match **`apps/api/.env.example`** (user `buildwel`, DB `buildwel`).

### Environment variables

**API** — create `apps/api/.env` from the example:

```bash
# macOS / Linux / Git Bash
cp apps/api/.env.example apps/api/.env
```

```powershell
# Windows PowerShell
Copy-Item apps\api\.env.example apps\api\.env
```

Edit values as needed: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `PORT`, `FRONTEND_URL`, `OTP_DEV_MODE`, etc.

**Web** — create `apps/web/.env.local`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

```powershell
Copy-Item apps\web\.env.example apps\web\.env.local
```

Set **`NEXT_PUBLIC_API_URL`** to your API origin (default local: `http://localhost:4000`).

> **Do not commit** `.env` or `.env.local`. They are gitignored; only `.env.example` belongs in the repo.

### Database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed --workspace=api
```

Migrations: **`apps/api/prisma/migrations`**.

Demo seed: **`apps/api/prisma/seed.ts`** inserts an upsert-safe Phase 1 prototype dataset (users, orgs, listings, requirements, matches, leads, deals, notifications, institutions/NDA, fraud, services, reviews, and profiles). Re-running the seed updates the same demo records.

### Run the apps

Use two terminals from the repo root:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

| App | URL |
|-----|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:api` | Nest API (`nest start --watch`) |
| `npm run dev:web` | Next.js dev server |
| `npm run dev:web:clean` | Remove web `.next` / cache, then start Next dev |
| `npm run build` | Build all workspaces that define `build` |
| `npm run db:up` / `npm run db:down` | Start / stop Docker Compose stack |
| `npm run prisma:generate` | Prisma client (API workspace) |
| `npm run prisma:migrate` | Prisma migrate dev (API workspace) |

Workspace-only examples:

```bash
npm run build --workspace=web
npm run build --workspace=api
```

## Production build

```bash
npm run build
```

Run outputs: API via Nest (`dist/`), web via `next build` / `next start` (see each app's `package.json`).

## Troubleshooting

### Next.js: `Cannot find module './NNN.js'` (stale `.next`)

Stop the dev server, then either:

```bash
npm run dev:web:clean
```

or from `apps/web`:

```bash
npm run clean
npm run dev
```

This deletes **`apps/web/.next`** and **`apps/web/node_modules/.cache`**. On **Windows**, storing the repo under **OneDrive** can cause flaky incremental builds; excluding **`.next`** from sync or cloning outside synced folders often helps.

### Prisma on Windows (`EPERM` on `query_engine`)

Close editors/terminals locking `node_modules`, then run `npm run prisma:generate` again.

### README looks blank on GitHub ("binary file")

`README.md` must be **UTF-8** text. If an editor saves **UTF-16**, GitHub treats it as binary and will not render it. Re-save `README.md` as **UTF-8** (Cursor/VS Code: bottom status bar encoding, or "Save with Encoding").

## Contributing

1. Fork the repository (if you use a fork workflow) and create a branch from `main` (or the default branch your team uses).
2. Keep changes focused; match existing patterns in `apps/api` and `apps/web`.
3. Run **`npm run build`** (and app linters if you touch those areas) before opening a pull request.
4. Open a **Pull Request** with a short description of behavior changes and any new env vars or migrations.

If the maintainers use **Issues** for triage, open one for larger design questions before heavy refactors.

## Security

If you discover a security vulnerability, please **do not** open a public issue with exploit details. Use [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) for this repository if enabled, or contact the maintainers through their preferred private channel.

## License

This project is **private** and does not ship with an open-source `LICENSE` file in the repository root. All rights reserved unless and until a license is added by the owners.
