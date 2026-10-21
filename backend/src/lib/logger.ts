import pino from "pino";

export const logger = pino({
  redact: ["req.headers.authorization", "req.headers.cookie", "password", "access_token", "refresh_token", "DATABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
