import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { charges, chargeEvents } from "./db/schema.js";
import { createHash } from "node:crypto";

export async function buildApp() {
  const pool = new Pool({
    host: process.env.PGHOST ?? "localhost",
    port: parseInt(process.env.PGPORT ?? "5432", 10),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    database: process.env.PGDATABASE ?? "fintech",
  });
  const db = drizzle(pool);
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/health", async (_request, reply) => {
    return reply.send({ ok: true });
  });
  app.get("/health/db", async (_request, reply) => {
    try {
      await pool.query("SELECT 1");
      return reply.send({ ok: true, db: "ok" });
    } catch {
      return reply.status(500).send({ ok: false, db: "error" });
    }
  });

  // POST /charges — create charge. Hint: on duplicate idempotency_key (PG code 23505),
  // return 200 + existing row if request_hash matches; else 409.
  app.post<{
    Body: {
      account_id: string;
      amount: number;
      currency: string;
      idempotency_key: string;
    };
  }>("/charges", async (request, reply) => {
    const { account_id, amount, currency, idempotency_key } =
      request.body ?? {};
    if (
      !account_id ||
      typeof amount !== "number" ||
      !currency ||
      !idempotency_key
    ) {
      return reply.status(400).send({
        error: "Missing or invalid fields: account_id, amount, currency, idempotency_key",
      });
    }
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ account_id, amount, currency }))
      .digest('hex')

    try {
      const { row, event } = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(charges)
          .values({
            accountId: account_id,
            amount,
            currency,
            idempotencyKey: idempotency_key,
            requestHash,
          })
          .returning();
        const [event] = await tx
          .insert(chargeEvents)
          .values({
            chargeId: row.id,
            status: "PENDING",
          })
          .returning();
        return { row, event };
      });
      return reply.status(201).send({ ...row, event });
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
      if (code === "23505") {
        const [existing] = await db
          .select()
          .from(charges)
          .where(eq(charges.idempotencyKey, idempotency_key));
        if (existing && existing.requestHash === requestHash) {
          return reply.status(200).send(existing);
        }
        return reply.status(409).send({
          error: "Idempotency key already used",
          code: "idempotency_key_conflict",
        });
      }
      app.log.error(err);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // 4. GET All charges Endpoint
  app.get('/charges', async (request, reply) => {
    try {
      const result = await db.select().from(charges);
      return result; // Fastify automatically serializes this to JSON
    } catch (error) {
      app.log.error(error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // GET /charges/:id — fetch charge by id.
  app.get<{ Params: { id: string } }>("/charges/:id", async (request, reply) => {
    const { id } = request.params;
    const [row] = await db.select().from(charges).where(eq(charges.id, id));
    if (!row) {
      return reply.status(404).send({ error: "Charge not found", id });
    }
    return reply.send(row);
  });

  // GET /charges/:id/events — fetch charge events by charge id.
  app.get<{ Params: { id: string } }>("/charges/:id/events", async (request, reply) => {
    const { id } = request.params;
    const result = await db.select().from(chargeEvents).where(eq(chargeEvents.chargeId, id));
    return result;
  });

  return { app, pool };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const { app } = await buildApp();
  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen({ port, host: "0.0.0.0" }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}
