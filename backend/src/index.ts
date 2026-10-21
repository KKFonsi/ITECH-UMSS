import { config } from "./config.js";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { pool } from "./lib/db.js";

const rawPort = config.PORT;
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  logger.error({ rawPort }, "Invalid PORT value");
  process.exit(1);
}

const server = app.listen(port, () => {
  logger.info({ port, env: process.env.NODE_ENV ?? "development" }, "UMSS API server listening");
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down");
  const deadline = setTimeout(() => process.exit(1), 10_000);
  deadline.unref();
  server.close(async () => {
    try {
      await pool.end();
      logger.info("HTTP server closed");
      clearTimeout(deadline);
      // Let Node drain its handles instead of forcing exit during pending cleanup.
      process.exitCode = 0;
    } catch {
      logger.error("Database pool shutdown failed");
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
