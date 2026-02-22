import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { chargeJobs, type ChargeJob } from "api/db/schema";

export type ClaimDb = NodePgDatabase<Record<string, unknown>>;

/**
 * Atomically claim one PENDING job: select with FOR UPDATE SKIP LOCKED, then mark IN_PROGRESS + lockedAt/lockedBy.
 * Returns the claimed job or null if none available.
 */
export async function claimNextJob(
  db: ClaimDb,
  workerId: string
): Promise<ChargeJob | null> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(chargeJobs)
      .where(eq(chargeJobs.status, "PENDING"))
      .orderBy(sql`${chargeJobs.createdAt} asc`)
      .limit(1)
      .for("update", { skipLocked: true });

    if (!job) return null;

    await tx
      .update(chargeJobs)
      .set({
        status: "IN_PROGRESS",
        lockedAt: new Date(),
        lockedBy: workerId,
      })
      .where(eq(chargeJobs.id, job.id));

    return job;
  });
}
