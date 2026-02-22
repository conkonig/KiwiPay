# KiwiPay (Fintech Practice)

Monorepo: API (Fastify), Worker, Web (Vue 3).

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**

   - Copy `api/.env.example` to `api/.env`
   - Copy `worker/.env.example` to `worker/.env`
   - Copy `web/.env.example` to `web/.env` (optional; defaults work for local API)
   - Set Postgres vars: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

3. **Run with Docker**

   Ensure `pnpm install` has been run once (generates `pnpm-lock.yaml` needed for build). Then:

   ```bash
   docker compose up -d
   ```

   - API: http://localhost:3000  
   - Postgres: localhost:5432  
   - Web: run locally (see below) or add to compose as needed.

4. **Run locally**

   - Start Postgres (or use Docker: `docker compose up -d postgres`).
   - From repo root:

   ```bash
   pnpm dev
   ```

   Or run individually:

   - `pnpm dev:api` — API on port 3000  
   - `pnpm dev:worker` — worker process  
   - `pnpm dev:web` — Vue app on port 5173  

5. **Build**

   From repo root, build everything (api is built before worker so worker gets the latest schema types):

   ```bash
   pnpm build
   ```

   Or build api then worker explicitly:

   ```bash
   pnpm --filter api build
   pnpm --filter worker build
   ```

6. **Lint**

   ```bash
   pnpm lint
   ```

7. **Test**

   ```bash
   pnpm test
   ```

   Postgres must be running for the `/health/db` test to pass (e.g. `docker compose up -d postgres`).

8. **Database (Drizzle)**

   - Schema: `api/src/db/schema.ts`. Migrations live in `db/`.
   - Generate migration after schema changes: `pnpm --filter api db:generate` (run from repo root, or `pnpm db:generate` from `api/`).
   - Apply migrations: `pnpm --filter api db:migrate` (or `pnpm db:migrate` from `api/`). Requires Postgres.
   - Optional: `pnpm --filter api db:studio` to open Drizzle Studio.

---

## Commands cheat sheet

| Goal | Command |
|------|--------|
| Install deps | `pnpm install` |
| Run app locally (api + worker + web) | `pnpm dev` |
| Run API only | `pnpm dev:api` |
| Run worker only | `pnpm dev:worker` |
| Run web only | `pnpm dev:web` |
| Run tests | `pnpm test` |
| Build all | `pnpm build` |
| Build api then worker (schema shared from api) | `pnpm --filter api build && pnpm --filter worker build` |
| Lint | `pnpm lint` |
| Start Postgres (Docker) | `docker compose up -d postgres` |
| Start full stack (Docker) | `docker compose up -d` |
