import { defineConfig } from "drizzle-kit";

const host = process.env.PGHOST ?? "localhost";
const port = process.env.PGPORT ?? "5432";
const user = process.env.PGUSER ?? "postgres";
const password = process.env.PGPASSWORD ?? "postgres";
const database = process.env.PGDATABASE ?? "fintech";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "../db",
  dbCredentials: {
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
    ssl: false,
  },
});
