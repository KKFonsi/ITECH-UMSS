/** Isolated browser-test server. Not imported or bundled by production code. */
import { mock } from "node:test";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";

Object.assign(process.env, {
  NODE_ENV: "test", LOG_LEVEL: "silent", DATABASE_URL: "postgresql://fixture:fixture@localhost:5432/fixture",
  PGSSL_MODE: "disable", SUPABASE_URL: "http://127.0.0.1:3099", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser_fixture_only",
});
const { default: api } = await import("../src/app.js");
const { pool } = await import("../src/lib/db.js");
const { supabase } = await import("../src/lib/supabase.js");
const roles = ["student", "technician", "admin", "superadmin"];
const profiles = roles.map((role, index) => ({ id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, full_name: `Fixture ${role}`, role, status: "active", university_id: null, username: role, zone: "Test campus" }));
let orders: Record<string, any>[] = [];
const history: unknown[] = [];
const expired = new Set<string>();
function user(profile: typeof profiles[number]) {
  return { id: profile.id, aud: "authenticated", role: "authenticated", email: `${profile.role}@example.test`, app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
}
function token(profile: typeof profiles[number]) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: profile.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })}.fixture`;
}
function fromToken(value: string) { return profiles.find(profile => token(profile).split(".")[1] === value.split(".")[1]) ?? profiles.find(profile => { try { return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString()).sub === profile.id && value.endsWith(".fixture"); } catch { return false; } }); }
mock.method(supabase.auth, "getUser", async (value: string) => { const candidate = fromToken(value); const profile = candidate && !expired.has(candidate.id) ? candidate : undefined; return { data: { user: profile ? user(profile) : null }, error: profile ? null : new Error("invalid") }; });
const decorate = (order: Record<string, any>) => ({ ...order, location: order.location_text, reporter_name: profiles.find(p => p.id === order.reported_by)?.full_name, technician_name: profiles.find(p => p.id === order.assigned_to)?.full_name ?? null });
async function query(text: string, values: any[] = []) {
  if (text.startsWith("SELECT id, full_name, role")) return { rows: profiles.filter(p => p.id === values[0]) };
  if (text.startsWith("SELECT id, full_name, zone")) return { rows: profiles.filter(p => p.role === "technician") };
  if (text.startsWith("SELECT id FROM public.profiles")) return { rows: profiles.filter(p => p.id === values[0] && p.role === "technician") };
  if (text.includes("FROM public.locations")) return { rows: [] };
  if (text.includes("FOR UPDATE")) return { rows: orders.filter(row => row.id === values[0]) };
  if (text.includes("FROM public.work_orders w")) {
    const rows = text.includes("WHERE w.id =") ? orders.filter(row => row.id === values[0])
      : text.includes("WHERE w.reported_by =") ? orders.filter(row => row.reported_by === values[0])
      : text.includes("WHERE w.assigned_to =") ? orders.filter(row => row.assigned_to === values[0]) : orders;
    return { rows: rows.map(decorate) };
  }
  if (text.startsWith("INSERT INTO public.work_orders")) {
    const row = { id: randomUUID(), ticket_number: `TEST-WO-${orders.length + 1}`, title: values[0], description: values[1], category: values[2], location_id: values[3], location_text: values[4], priority: values[5], status: "Pending", reported_by: values[6], source: values[7], assigned_to: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    orders.push(row); return { rows: [{ id: row.id }] };
  }
  if (text.startsWith("UPDATE public.work_orders")) {
    const row = orders.find(row => row.id === values.at(-1));
    for (const match of text.matchAll(/(\w+) = \$(\d+)/g)) row![match[1]] = values[Number(match[2]) - 1];
    return { rows: [] };
  }
  if (text.startsWith("INSERT INTO public.work_order_updates")) { history.push(values); return { rows: [] }; }
  throw new Error("Unsupported browser-fixture query");
}
mock.method(pool, "query", query);
mock.method(pool, "connect", async () => {
  let backup: typeof orders;
  return { release() {}, async query(text: string, values: any[] = []) {
    if (text === "BEGIN") { backup = structuredClone(orders); return { rows: [] }; }
    if (text === "COMMIT") return { rows: [] };
    if (text === "ROLLBACK") { orders = backup!; return { rows: [] }; }
    return query(text, values);
  } };
});
const fixture = express();
fixture.use(cors()); fixture.use(express.json());
fixture.post("/auth/v1/token", (req, res) => {
  const role = req.query.grant_type === "refresh_token" ? String(req.body.refresh_token).replace("fixture-refresh-", "") : String(req.body.email).replace("@example.test", "");
  const profile = profiles.find(profile => profile.role === role);
  if (!profile || (req.query.grant_type !== "refresh_token" && req.body.password !== "fixture-only-password")) { res.status(400).json({ error: "invalid_grant", error_description: "Invalid login credentials" }); return; }
  if (req.query.grant_type !== "refresh_token") expired.delete(profile.id);
  res.json({ access_token: token(profile), refresh_token: `fixture-refresh-${role}`, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: user(profile) });
});
fixture.get("/auth/v1/user", (req, res) => { const profile = fromToken(req.get("authorization")?.replace("Bearer ", "") ?? ""); if (!profile) { res.status(401).json({ message: "invalid" }); return; } res.json(user(profile)); });
fixture.post("/auth/v1/logout", (_req, res) => { res.status(204).end(); });
fixture.post("/__fixture/expire/:role", (req, res) => { const profile = profiles.find(profile => profile.role === req.params.role); if (profile) expired.add(profile.id); res.status(204).end(); });
fixture.use(api);
fixture.listen(3099, "127.0.0.1", () => console.log("Isolated UMSS browser fixture ready on 127.0.0.1:3099; no live database or Auth connections."));
