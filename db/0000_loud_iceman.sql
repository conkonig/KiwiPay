CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charges_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "charges_amount_positive" CHECK ("charges"."amount" > 0),
	CONSTRAINT "charges_currency_non_empty" CHECK (length("charges"."currency") > 0)
);
