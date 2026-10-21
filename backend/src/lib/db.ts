import pg from "pg";
import { config, backendRoot } from "../config.js";
import { logger } from "./logger.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const database = new URL(config.DATABASE_URL);
// pg connection-string SSL parameters otherwise replace the explicit TLS options.
for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"]) database.searchParams.delete(key);
const certificatePath = resolve(backendRoot, config.PG_CA_CERT_PATH ?? "certs/supabase-ca.crt");
const ca = config.PG_CA_CERT?.replace(/\\n/g, "\n") ?? (existsSync(certificatePath) ? readFileSync(certificatePath, "utf8") : undefined);
if (config.PG_CA_CERT_PATH && !ca) throw new Error("PG_CA_CERT_PATH does not identify a readable certificate");

export const pool = new pg.Pool({
  connectionString: database.toString(),
  max: config.PG_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 15_000,
  idle_in_transaction_session_timeout: 15_000,
  ssl: config.PGSSL_MODE === "disable" ? false : {
    rejectUnauthorized: true,
    ...(ca ? { ca } : {}),
  },
});
pool.on("error", () => logger.error("Idle PostgreSQL connection failed"));

export async function transaction<T>(operation: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
