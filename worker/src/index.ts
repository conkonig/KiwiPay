import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { chargeJobs, charges, chargeEvents } from "api/db/schema";
import { claimNextJob } from "./claim.js";

import os from "node:os";
import crypto from "node:crypto";

const pool = new Pool({
  host: process.env.PGHOST ?? "localhost",
  port: parseInt(process.env.PGPORT ?? "5432", 10),
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "postgres",
  database: process.env.PGDATABASE ?? "fintech",
});
const db = drizzle(pool);

const workerId = process.env.WORKER_ID ?? `${os.hostname()}:${process.pid}:${crypto.randomUUID().slice(0, 8)}`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let ticking = false;

async function tick(): Promise<void> {
  // Prevent overlapping ticks if the previous one is still running.
  if (ticking) return;
  ticking = true;

  try {
    // 1) ATOMIC CLAIM: select + mark IN_PROGRESS inside a single DB transaction.
    const claimedJob = await claimNextJob(db, workerId);

    if (!claimedJob) {
      // No work available.
      return;
    }

    console.log("claimed job", { id: claimedJob.id, type: claimedJob.type, workerId });

    // 2) SIMULATE WORK: small delay so UI can observe transitions.
    // You can tweak this via env var, e.g. WORK_SIM_MS=250
    const simMs = Number(process.env.WORK_SIM_MS ?? "250");
    await sleep(simMs);

    // 3) APPLY EFFECTS + COMPLETE JOB atomically.
    // For demo purposes we mark the charge SUCCEEDED and append an event.
    await db.transaction(async (tx) => {
      // Mark the charge succeeded (if the job payload includes chargeId).
      const chargeId = (claimedJob.payload as any)?.chargeId as string | undefined;
      if (chargeId) {
        await tx.update(charges).set({ status: "SUCCEEDED" }).where(eq(charges.id, chargeId));
        await tx.insert(chargeEvents).values({ chargeId, status: "SUCCEEDED" });
      }

      await tx
        .update(chargeJobs)
        .set({
          status: "COMPLETED",
          completedAt: new Date(),
        })
        .where(eq(chargeJobs.id, claimedJob.id));
    });

    console.log("completed job", { id: claimedJob.id });
  } catch (err) {
    console.error("worker tick failed:", err);

    // Minimal failure handling for now: if we can identify a job, mark it FAILED.
    // (We will build retries/DLQ later.)
    try {
      // no-op: we don't have the job id here unless we restructure; keep simple for now.
    } catch {
      // ignore
    }
  } finally {
    ticking = false;
  }
}


async function run(): Promise<void> {
  await tick();

  if (process.env.WORKER_RUN_ONCE === "true") {
    return;
  }

  const pollMs = Number(process.env.WORKER_POLL_MS ?? "500");

  // Use a recursive loop instead of setInterval to avoid overlapping ticks.
  while (true) {
    await sleep(pollMs);
    await tick();
  }
}

run().catch((err) => {
  console.error("worker fatal error:", err);
  process.exit(1);
});

