import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

loadEnv({ path: resolve(process.cwd(), ".env.test.local"), quiet: true });
process.env.LOG_LEVEL = "silent";
const roles = ["student", "technician", "admin", "superadmin"] as const;
const missing = roles.flatMap(role => ["EMAIL", "PASSWORD"].map(field => `TEST_${role.toUpperCase()}_${field}`)).filter(key => !process.env[key]);
if (missing.length) throw new Error(`Configure disposable test accounts in backend/.env.test.local: ${missing.join(", ")}`);
const { config } = await import("../src/config.js");
const { pool, transaction } = await import("../src/lib/db.js");
const { default: app } = await import("../src/app.js");
const sessions: { client: SupabaseClient; token: string; refresh: string; id: string; role: typeof roles[number] }[] = [];
const created: { id: string; owner: string }[] = [];
const server = app.listen(0, "127.0.0.1");
await new Promise<void>(resolve => server.once("listening", resolve));
const address = server.address();
const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/api`;
async function request(path: string, token?: string, method = "GET", body?: unknown) {
  const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
let phase = "configuration";
let diagnostic: { status?: number; code?: string } = {};
try {
  for (const role of roles) {
    phase = `${role} login`;
    const client = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: process.env[`TEST_${role.toUpperCase()}_EMAIL`]!, password: process.env[`TEST_${role.toUpperCase()}_PASSWORD`]! });
    diagnostic = error ? { status: error.status, code: error.code } : {};
    assert.ok(!error && data.session, "Test-account login failed");
    const token = data.session!.access_token;
    const me = await request("/auth/me", token);
    phase = `${role} profile verification`;
    diagnostic = { status: me.status };
    assert.equal(me.status, 200); assert.equal(me.body.profile.role, role);
    sessions.push({ client, token, refresh: data.session!.refresh_token, id: data.user!.id, role });
    console.log(`PASS ${role} login and verified profile`);
  }
  const [student, technician, admin, superadmin] = sessions;
  phase = "authorization";
  assert.equal((await request("/work-orders")).status, 401);
  assert.equal((await request("/work-orders", "invalid-jwt")).status, 401);
  assert.equal((await request("/work-orders", technician.token, "POST", {})).status, 403);
  const report = { title: "UMSS automated verification ticket", description: "Disposable integration-test report, automatically removed after verification.", category: "Others", location: "UMSS verification fixture location", priority: "low" };
  assert.equal((await request("/work-orders", student.token, "POST", { ...report, reported_by: admin.id })).status, 400);
  for (const owner of [student, admin]) {
    const result = await request("/work-orders", owner.token, "POST", report);
    assert.equal(result.status, 201);
    created.push({ id: result.body.workOrder.id, owner: owner.id });
  }
  const order = created[0].id;
  assert.equal((await request(`/work-orders/${order}`, student.token, "PATCH", { status: "resolved" })).status, 403);
  assert.equal((await request(`/work-orders/${order}`, technician.token, "PATCH", { status: "resolved" })).status, 403);
  assert.equal((await request(`/work-orders/${order}`, admin.token, "PATCH", { assigned_to: student.id })).status, 400);
  assert.equal((await request(`/work-orders/${order}`, admin.token, "PATCH", { assigned_to: technician.id })).status, 200);
  assert.equal((await request(`/work-orders/${created[1].id}`, technician.token, "PATCH", { status: "resolved" })).status, 403);
  assert.equal((await request(`/work-orders/${order}`, technician.token, "PATCH", { priority: "high" })).status, 403);
  assert.equal((await request(`/work-orders/${order}`, technician.token, "PATCH", { status: "resolved", notes: "Integration verification" })).status, 200);
  console.log("PASS unauthorized requests, technician ownership, assignment and status updates");
  phase = "persistence and history";
  const record = await pool.query("SELECT reported_by, status FROM public.work_orders WHERE id = $1", [order]);
  assert.equal(record.rows[0].reported_by, student.id); assert.equal(record.rows[0].status, "Resolved");
  const history = await pool.query("SELECT actor_id, old_status, new_status FROM public.work_order_updates WHERE work_order_id = $1", [order]);
  assert.ok(history.rows.some(row => row.actor_id === technician.id && row.new_status === "Resolved"));
  for (const session of sessions) {
    const result = await request("/work-orders", session.token);
    assert.equal(result.status, 200);
    if (session.role === "student") assert.ok(result.body.workOrders.every((row: any) => row.reported_by === student.id));
    if (session.role === "technician") assert.ok(result.body.workOrders.every((row: any) => row.assigned_to === technician.id));
  }
  assert.ok((await request("/work-orders", superadmin.token)).body.workOrders.some((row: any) => row.id === order));
  const restored = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const restoredSession = await restored.auth.setSession({ access_token: student.token, refresh_token: student.refresh });
  assert.equal(restoredSession.error, null);
  assert.equal((await request("/auth/me", restoredSession.data.session!.access_token)).status, 200);
  assert.ok((await request("/work-orders", restoredSession.data.session!.access_token)).body.workOrders.some((row: any) => row.id === order));
  console.log("PASS PostgreSQL persistence, history and restored session");
  phase = "logout";
  for (const session of sessions) { assert.equal((await session.client.auth.signOut({ scope: "local" })).error, null); assert.equal((await session.client.auth.getSession()).data.session, null); }
  console.log("PASS logout for all test sessions");
} catch {
  console.error(`FAIL live verification during ${phase}; no credentials or tokens are printed.`);
  console.error(JSON.stringify(diagnostic));
  process.exitCode = 1;
} finally {
  try {
    if (created.length) await transaction(async db => {
      for (const record of created) await db.query("DELETE FROM public.work_orders WHERE id = $1 AND reported_by = $2 AND title = $3", [record.id, record.owner, "UMSS automated verification ticket"]);
    });
    console.log("Verification tickets cleaned up; existing rows and schema were untouched.");
  } catch { console.error("Verification-ticket cleanup failed; remove only tickets titled 'UMSS automated verification ticket'."); process.exitCode = 1; }
  for (const session of sessions) await session.client.auth.signOut({ scope: "local" }).catch(() => {});
  await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.end();
}
