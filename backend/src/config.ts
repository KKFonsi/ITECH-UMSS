import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { z } from "zod";

// Works with npm --prefix backend, root scripts, and the bundled production entry.
export const backendRoot = existsSync(resolve(process.cwd(), "backend/package.json")) ? resolve(process.cwd(), "backend") : process.cwd();
loadEnv({ path: resolve(backendRoot, ".env"), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url().refine(value => /^postgres(ql)?:\/\//.test(value)),
  SUPABASE_URL: z.string().url().refine(value => {
    const url = new URL(value);
    return !url.hostname.includes("pooler.supabase.com") && !url.username && !url.password && !url.search && !url.hash
      && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
  }).transform(value => new URL(value).origin),
  SUPABASE_PUBLISHABLE_KEY: z.string().regex(/^sb_publishable_[A-Za-z0-9_-]+$/).min(20),
  PG_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  PGSSL_MODE: z.enum(["verify-full", "disable"]).default("verify-full"),
  PG_CA_CERT: z.string().optional(),
  PG_CA_CERT_PATH: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173"),
});

export function parseConfig(env: NodeJS.ProcessEnv) {
  const result = schema.safeParse(env);
  if (!result.success) {
    // Never include supplied values or Zod's full input in configuration errors.
    throw new Error(`Invalid server configuration: ${[...new Set(result.error.issues.map(issue => issue.path.join(".")))].join(", ")}`);
  }
  const config = result.data;
  const database = new URL(config.DATABASE_URL);
  if (config.PGSSL_MODE === "disable" && !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) {
    throw new Error("PGSSL_MODE=disable is only permitted for a local database");
  }
  const origins = config.ALLOWED_ORIGINS.split(",").map(origin => origin.trim()).filter(Boolean);
  if (!origins.length || origins.some(origin => !z.string().url().safeParse(origin).success || !["http:", "https:"].includes(new URL(origin).protocol) || new URL(origin).origin !== origin)) {
    throw new Error("ALLOWED_ORIGINS must contain explicit HTTP(S) origins");
  }
  return { ...config, origins };
}

export const config = parseConfig(process.env);
