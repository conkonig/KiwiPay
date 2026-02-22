import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST ?? "localhost",
  port: parseInt(process.env.PGPORT ?? "5432", 10),
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "postgres",
  database: process.env.PGDATABASE ?? "fintech",
});

async function tick(): Promise<void> {
  try {
    await pool.query("SELECT 1");
    console.log("worker alive");
  } catch (err) {
    console.error("worker db check failed:", err);
  }
}

await tick();
setInterval(tick, 10000);
