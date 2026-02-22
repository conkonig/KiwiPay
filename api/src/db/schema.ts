import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const charges = pgTable(
  "charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("PENDING"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    requestHash: text("request_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    amountPositive: check(
      "charges_amount_positive",
      sql`${table.amount} > 0`
    ),
    currencyNonEmpty: check(
      "charges_currency_non_empty",
      sql`length(${table.currency}) > 0`
    ),
  })
);

export const chargeEvents = pgTable(
  "charge_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chargeId: uuid("charge_id").notNull(),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    chargeIdIdx: index("charge_events_charge_id_idx").on(table.chargeId),
    chargeIdFk: foreignKey({
      columns: [table.chargeId],
      foreignColumns: [charges.id],
      name: "charge_events_charge_id_fk",
    }),
  })
);

export const chargeJobs = pgTable(
  "charge_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("PENDING"),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusRunAtIdx: index("charge_jobs_status_run_at_idx").on(
      table.status,
      table.runAt
    ),
  })
);

export type Charge = typeof charges.$inferSelect;
export type NewCharge = typeof charges.$inferInsert;
export type ChargeEvent = typeof chargeEvents.$inferSelect;
export type NewChargeEvent = typeof chargeEvents.$inferInsert;
export type ChargeJob = typeof chargeJobs.$inferSelect;
export type NewChargeJob = typeof chargeJobs.$inferInsert;
