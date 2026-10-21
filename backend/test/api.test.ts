import { after, before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";

// Isolated verification fixtures: never connects to a real database or Supabase.
Object.assign(process.env, {
  NODE_ENV: "test", LOG_LEVEL: "silent", DATABASE_URL: "postgresql://fixture:fixture@localhost:5432/fixture",
  PGSSL_MODE: "disable", SUPABASE_URL: "https://fixture.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture_public_key",
});
const { default: app } = await import("../src/app.js");
const { pool } = await import("../src/lib/db.js");
const { supabase } = await import("../src/lib/supabase.js");
const { parseConfig } = await import("../src/config.js");
const ids = { student: "00000000-0000-4000-8000-000000000001", technician: "00000000-0000-4000-8000-000000000002", admin: "00000000-0000-4000-8000-000000000003", superadmin: "00000000-0000-4000-8000-000000000004", inactive: "00000000-0000-4000-8000-000000000005" };
const profiles = Object.entries(ids).map(([role, id]) => ({ id, full_name: role, role: role === "inactive" ? "student" : role, university_id: null, username: null, zone: null, status: role === "inactive" ? "inactive" : "active" }));
let orders: Record<string, any>[] = [];
let history: unknown[][] = [];
let calls: { text: string; values: any[] }[] = [];
let failHistory = false;
let server: Server;
let base: string;
async function query(text: string, values: any[] = []) {
  calls.push({ text, values });
  if (text.startsWith("SELECT id, full_name, role")) return { rows: profiles.filter(p => p.id === values[0]) };
  if (text.startsWith("SELECT id FROM public.profiles")) return { rows: profiles.filter(p => p.id === values[0] && p.role === "technician" && p.status === "active") };
  if (text.startsWith("SELECT id, building, room, floor FROM public.locations")) return { rows: values[0] === "20000000-0000-4000-8000-000000000001" ? [{ id: "20000000-0000-4000-8000-000000000001", building: "Main", room: "Room 101", floor: "1F" }] : [] };
  if (text.includes("FOR UPDATE")) return { rows: orders.filter(order => order.id === values[0]).map(order => ({ ...order })) };
  if (text.includes("FROM public.work_orders w")) {
    const rows = text.includes("WHERE w.id =") ? orders.filter(order => order.id === values[0])
      : text.includes("WHERE w.reported_by = $1") ? orders.filter(order => order.reported_by === values[0])
      : text.includes("WHERE w.assigned_to = $1") ? orders.filter(order => order.assigned_to === values[0]) : orders;
    return { rows: structuredClone(rows) };
  }
  if (text.startsWith("INSERT INTO public.work_orders")) {
    const columns = text.slice(text.indexOf("(") + 1, text.indexOf(")")).split(",").map(value => value.trim().replaceAll('"', ""));
    const order = { id: `10000000-0000-4000-8000-${String(orders.length + 1).padStart(12,"0")}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), assigned_to: null, reporter_name: "student", technician_name: null, location: "Main Building", ...Object.fromEntries(columns.map((column, index) => [column, column === "status" ? "Pending" : values[index > 5 ? index - 1 : index]])) };
    orders.push(order); return { rows: [{ id: order.id }] };
  }
  if (text.startsWith("UPDATE public.work_orders")) {
    const order = orders.find(order => order.id === values.at(-1));
    for (const match of text.matchAll(/(\w+) = \$(\d+)/g)) order![match[1]] = values[Number(match[2]) - 1];
    return { rows: [] };
  }
  if (text.startsWith("INSERT INTO public.work_order_updates")) {
    if (failHistory) throw new Error("Fixture history failure");
    history.push(values); return { rows: [] };
  }
  throw new Error("Unexpected fixture query");
}
before(async () => {
  mock.method(supabase.auth, "getUser", async (token: string) => ({ data: { user: token in ids ? { id: ids[token as keyof typeof ids], is_anonymous: false, user_metadata: { role: "superadmin" } } : null }, error: token in ids ? null : new Error("invalid") }));
  mock.method(pool, "query", query);
  mock.method(pool, "connect", async () => {
    let backup: typeof orders;
    return { release() {}, async query(text: string, values: any[] = []) {
      if (text === "BEGIN") { calls.push({ text, values }); backup = structuredClone(orders); return { rows: [] }; }
      if (text === "ROLLBACK") { calls.push({ text, values }); orders = backup!; return { rows: [] }; }
      if (text === "COMMIT") { calls.push({ text, values }); return { rows: [] }; }
      return query(text, values);
    } };
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/api`;
});
beforeEach(() => {
  orders = [
    { id: "10000000-0000-4000-8000-000000000001", title: "Leaking pipe", status: "Pending", priority: "High", reported_by: ids.student, assigned_to: ids.technician, location: "Main", created_at: "2026-01-01" },
    { id: "10000000-0000-4000-8000-000000000002", title: "Other report", status: "Pending", priority: "Low", reported_by: ids.admin, assigned_to: null, location: "Library", created_at: "2026-01-01" },
  ];
  history = []; calls = []; failHistory = false;
});
after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); mock.restoreAll(); await pool.end(); });
async function request(path: string, token?: string, method = "GET", body?: unknown) {
  return fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
test("health stays public; all protected endpoints reject missing/forged sessions", async () => {
  assert.equal((await request("/healthz")).status, 200);
  for (const endpoint of ["/auth/me", "/work-orders", "/locations", "/technicians"]) {
    assert.equal((await request(endpoint)).status, 401);
    assert.equal((await request(endpoint, "forged")).status, 401);
  }
});
test("profile role comes from PostgreSQL, ignoring forged metadata; inactive users get 403", async () => {
  const response = await request("/auth/me", "student");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).profile.role, "student");
  assert.equal((await request("/auth/me", "inactive")).status, 403);
});
test("student and technician listings are scoped; both staff roles see all work orders", async () => {
  for (const role of ["student", "technician", "admin", "superadmin"]) {
    const response = await request("/work-orders", role);
    assert.equal(response.status, 200);
    const rows = (await response.json()).workOrders;
    assert.equal(rows.length, role === "admin" || role === "superadmin" ? 2 : 1);
    assert.equal(rows[0].id, "10000000-0000-4000-8000-000000000001");
  }
});
test("every role restriction is enforced by Express", async () => {
  assert.equal((await request("/work-orders/10000000-0000-4000-8000-000000000001", "student", "PATCH", { status: "resolved" })).status, 403);
  assert.equal((await request("/work-orders", "technician", "POST", {})).status, 403);
  assert.equal((await request("/technicians", "student")).status, 403);
  assert.equal((await request("/technicians", "technician")).status, 403);
});
const report = { title: "Leaking faucet", description: "The faucet is leaking continuously.", category: "Plumbing", location_id: "20000000-0000-4000-8000-000000000001", priority: "medium" };
test("creation derives reporter identity, rejects spoofed/unknown fields and persists through another GET", async () => {
  assert.equal((await request("/work-orders", "student", "POST", { ...report, reported_by: ids.admin })).status, 400);
  assert.equal((await request("/work-orders", "student", "POST", { ...report, role: "admin" })).status, 400);
  assert.equal((await request("/work-orders", "student", "POST", { ...report, description: "short" })).status, 400);
  const created = await request("/work-orders", "student", "POST", report);
  assert.equal(created.status, 201);
  const row = (await created.json()).workOrder;
  assert.equal(row.reported_by, ids.student);
  assert.ok((await (await request("/work-orders", "student")).json()).workOrders.some((order: any) => order.id === row.id));
});
test("technicians cannot edit another order, reassign themselves, or alter report fields", async () => {
  assert.equal((await request("/work-orders/10000000-0000-4000-8000-000000000002", "technician", "PATCH", { status: "resolved" })).status, 403);
  assert.equal((await request("/work-orders/10000000-0000-4000-8000-000000000001", "technician", "PATCH", { assigned_to: ids.technician })).status, 403);
  assert.equal((await request("/work-orders/10000000-0000-4000-8000-000000000001", "technician", "PATCH", { priority: "high" })).status, 403);
  assert.equal((await request("/work-orders/10000000-0000-4000-8000-000000000001", "technician", "PATCH", { status: "pending" })).status, 403);
});
test("staff assignment rejects non-technicians; parameterized text cannot become SQL", async () => {
  assert.equal((await request("/work-orders/10000000-0000-4000-8000-000000000001", "admin", "PATCH", { assigned_to: ids.student })).status, 400);
  assert.equal((await request("/work-orders/10000000-0000-4000-8000-000000000001", "admin", "PATCH", { assigned_to: ids.technician })).status, 200);
  const injection = "Robert'); DROP TABLE work_orders;--";
  assert.equal((await request("/work-orders", "student", "POST", { ...report, title: injection })).status, 201);
  assert.ok(calls.some(call => call.values.includes(injection)));
  assert.ok(calls.every(call => !call.text.includes(injection)));
});
test("status and history commit together with the verified actor", async () => {
  const response = await request("/work-orders/10000000-0000-4000-8000-000000000001", "technician", "PATCH", { status: "resolved", notes: "Replaced gasket" });
  assert.equal(response.status, 200);
  assert.equal(history.length, 1);
  assert.deepEqual(history[0], ["10000000-0000-4000-8000-000000000001", ids.technician, "Pending", "Resolved", "Replaced gasket"]);
  assert.ok(calls.some(call => call.text === "COMMIT"));
});
test("history failure rolls back the status update and returns no internal details", async () => {
  failHistory = true;
  const response = await request("/work-orders/10000000-0000-4000-8000-000000000001", "technician", "PATCH", { status: "resolved" });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal server error" });
  assert.equal(orders[0].status, "Pending");
  assert.ok(calls.some(call => call.text === "ROLLBACK"));
});
test("configuration errors identify variable names without exposing supplied secrets", () => {
  assert.throws(() => parseConfig({ ...process.env, DATABASE_URL: "private-password", SUPABASE_PUBLISHABLE_KEY: "sb_secret_dont_expose" }), error => error instanceof Error && error.message.includes("DATABASE_URL") && !error.message.includes("private-password") && !error.message.includes("sb_secret_dont_expose"));
});
test("a copied REST endpoint is normalized to the project origin for Auth SDK requests", () => {
  assert.equal(parseConfig({ ...process.env, SUPABASE_URL: "https://fixture.supabase.co/rest/v1/" }).SUPABASE_URL, "https://fixture.supabase.co");
});
