import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Run test files one after another so worker.test and charge.test don't race on charge_jobs.
    fileParallelism: false,
    server: {
      deps: {
        inline: ["@fastify/cors", "fastify", "pg"],
      },
    },
  },
});
