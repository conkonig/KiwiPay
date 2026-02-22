import { test, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { buildApp } from "../api/src/index";
import { chargeJobs } from "../api/src/db/schema";
import { claimNextJob } from "../worker/src/claim";

let app: Awaited<ReturnType<typeof buildApp>>["app"];
let pool: Awaited<ReturnType<typeof buildApp>>["pool"];
let db: ReturnType<typeof drizzle>;

beforeEach(async () => {
  const built = await buildApp();
  app = built.app;
  pool = built.pool;
  db = drizzle(pool);
  await pool.query("TRUNCATE TABLE charge_jobs RESTART IDENTITY CASCADE");
});

test("claims one PENDING job and marks it IN_PROGRESS with lock fields", async () => {
  const [job] = await db
    .insert(chargeJobs)
    .values({
      type: "PROCESS_CHARGE",
      status: "PENDING",
      payload: { chargeId: "00000000-0000-0000-0000-000000000001" },
    })
    .returning();

  const workerId = "worker-A";
  const claimed = await claimNextJob(db, workerId);

  expect(claimed).not.toBeNull();
  expect(claimed!.id).toBe(job.id);

  const [fresh] = await db.select().from(chargeJobs).where(eq(chargeJobs.id, job.id));
  expect(fresh.status).toBe("IN_PROGRESS");
  expect(fresh.lockedBy).toBe(workerId);
  expect(fresh.lockedAt).toBeTruthy();
});
