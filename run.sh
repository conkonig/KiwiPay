# Build (api first so worker gets updated schema types from api/dist)
pnpm --filter api build
pnpm --filter worker build

# Drizzle studio
pnpm --filter api db:studio

# Generate migrations
pnpm --filter api db:generate

# Run migrations
pnpm --filter api db:migrate

# Truncate charges table
pnpm --filter api db:clear-charges

# Docker compose local dev (API + worker + postgres with hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Vue app local dev (use this in a separate terminal when Docker dev is running — don't use "pnpm run dev" or you'll double up API/worker on port 3000)
pnpm --filter web dev

# Example curls (API on localhost:3000)
# GET health
curl http://localhost:3000/health
# GET health/db
curl http://localhost:3000/health/db
# GET all charges
curl http://localhost:3000/charges
# GET charge by id
curl http://localhost:3000/charges/YOUR_CHARGE_UUID
# POST create charge
curl -X POST http://localhost:3000/charges -H "Content-Type: application/json" -d '{"account_id":"550e8400-e29b-41d4-a716-446655440000","amount":1000,"currency":"NZD","idempotency_key":"key-unique-1","request_hash":"sha256:abc123"}'
