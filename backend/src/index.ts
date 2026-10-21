import app from "./app.js";
import { logger } from "./lib/logger.js";

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  logger.error({ rawPort }, "Invalid PORT value");
  process.exit(1);
}

const server = app.listen(port, () => {
  logger.info({ port, env: process.env.NODE_ENV ?? "development" }, "UMSS API server listening");
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  // Force exit if server doesn't close in time
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
