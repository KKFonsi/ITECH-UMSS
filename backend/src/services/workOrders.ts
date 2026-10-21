import { z } from "zod";
import { pool, transaction } from "../lib/db.js";
import { HttpError } from "../lib/errors.js";
import type { Profile } from "../types.js";

export const orderId = z.string().uuid();
const fields = {
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  category: z.enum(["Electrical", "Plumbing", "Structural / Carpentry", "Janitorial / Cleaning", "Others"]),
  location_id: z.string().uuid().optional(),
  location: z.string().trim().min(3).max(240).optional(),
  priority: z.enum(["low", "medium", "high"]),
};
export const createOrder = z.object({ ...fields, priority: fields.priority.default("medium") })
  .strict().refine(value => value.location_id || value.location, { path: ["location_id"], message: "Location is required" });
export const updateOrder = z.object({
  title: fields.title.optional(), description: fields.description.optional(), category: fields.category.optional(),
  location_id: fields.location_id, location: fields.location, priority: fields.priority.optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  status: z.enum(["pending", "in_progress", "resolved"]).optional(),
  notes: z.string().trim().max(4000).optional(),
}).strict().refine(value => Object.keys(value).length > 0, "At least one field is required");
const statuses = { pending: "Pending", in_progress: "In Progress", resolved: "Resolved" } as const;
const priorities = { low: "Low", medium: "Medium", high: "High" } as const;
const select = `SELECT w.id, w.ticket_number, w.title, w.description, w.category, w.status, w.priority,
  w.reported_by, reporter.full_name AS reporter_name, w.assigned_to,
  technician.full_name AS technician_name, w.location_text AS location, w.location_id,
  w.created_at, w.updated_at
  FROM public.work_orders w
  LEFT JOIN public.profiles reporter ON reporter.id = w.reported_by
  LEFT JOIN public.profiles technician ON technician.id = w.assigned_to`;
export function present(row: Record<string, unknown>) {
  return { ...row, status: String(row.status).toLowerCase().replaceAll(" ", "_"), priority: String(row.priority).toLowerCase() };
}
export async function listOrders(user: Profile, limit: number, offset: number) {
  const filter = user.role === "student" ? "w.reported_by = $1" : user.role === "technician" ? "w.assigned_to = $1" : "TRUE";
  const scoped = filter !== "TRUE";
  const { rows } = await pool.query(`${select} WHERE ${filter} ORDER BY w.created_at DESC, w.id DESC LIMIT $${scoped ? 2 : 1} OFFSET $${scoped ? 3 : 2}`, scoped ? [user.id, limit, offset] : [limit, offset]);
  return rows.map(present);
}

async function resolveLocation(db: { query: typeof pool.query }, input: { location_id?: string; location?: string }) {
  if (input.location_id) {
    const result = await db.query("SELECT id, building, room, floor FROM public.locations WHERE id = $1 AND is_active = true FOR SHARE", [input.location_id]);
    const row = result.rows[0];
    if (!row) throw new HttpError(400, "Location is unavailable");
    return { id: row.id, text: [row.building, row.room, row.floor].filter(Boolean).join(" · ") };
  }
  if (!input.location) throw new HttpError(400, "A specific location is required");
  return { id: null, text: input.location };
}
export async function submitOrder(user: Profile, input: z.infer<typeof createOrder>) {
  return transaction(async db => {
    const location = await resolveLocation(db, input);
    const result = await db.query(
      `INSERT INTO public.work_orders (title, description, category, location_id, location_text, priority, status, reported_by, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8) RETURNING id`,
      [input.title, input.description, input.category, location.id, location.text, priorities[input.priority], user.id, user.role === "student" ? "manual" : "admin"],
    );
    return present((await db.query(`${select} WHERE w.id = $1`, [result.rows[0].id])).rows[0]);
  });
}
export async function patchOrder(user: Profile, order: string, input: z.infer<typeof updateOrder>) {
  if (user.role === "technician" && Object.keys(input).some(key => !["status", "notes"].includes(key))) {
    throw new HttpError(403, "Technicians may only update status and completion notes");
  }
  return transaction(async db => {
    const result = await db.query("SELECT id, status, assigned_to FROM public.work_orders WHERE id = $1 FOR UPDATE", [order]);
    const current = result.rows[0];
    if (!current) throw new HttpError(404, "Work order not found");
    if (user.role === "technician" && current.assigned_to !== user.id) throw new HttpError(403, "This work order is not assigned to you");
    if (user.role === "technician" && input.status === "pending") throw new HttpError(403, "Technicians may start or resolve assigned work orders");
    const statusChanged = input.status !== undefined && current.status !== statuses[input.status];
    if (input.notes !== undefined && !statusChanged) throw new HttpError(400, "Notes must accompany a status change");
    if (input.assigned_to) {
      const assignee = await db.query("SELECT id FROM public.profiles WHERE id = $1 AND role = 'technician' AND status = 'active' FOR SHARE", [input.assigned_to]);
      if (!assignee.rows[0]) throw new HttpError(400, "Assignee must be an active technician");
    }
    const values: unknown[] = [];
    const setters: string[] = [];
    // Field names come solely from this server-side allowlist. Only values are client supplied.
    const set = (field: string, value: unknown) => { values.push(value); setters.push(`${field} = $${values.length}`); };
    for (const field of ["title", "description", "category"] as const) if (input[field] !== undefined) set(field, input[field]);
    if (input.location_id !== undefined || input.location !== undefined) {
      const location = await resolveLocation(db, input); set("location_id", location.id); set("location_text", location.text);
    }
    if (input.priority !== undefined) set("priority", priorities[input.priority]);
    if (input.assigned_to !== undefined) set("assigned_to", input.assigned_to);
    if (input.status !== undefined) {
      set("status", statuses[input.status]);
      if (statusChanged) set("resolved_at", input.status === "resolved" ? new Date() : null);
    }
    set("updated_at", new Date()); values.push(order);
    await db.query(`UPDATE public.work_orders SET ${setters.join(", ")} WHERE id = $${values.length}`, values);
    if (statusChanged) {
      await db.query("INSERT INTO public.work_order_updates (work_order_id, actor_id, old_status, new_status, note) VALUES ($1, $2, $3, $4, $5)",
        [current.id, user.id, current.status, statuses[input.status!], input.notes ?? ""]);
    }
    return present((await db.query(`${select} WHERE w.id = $1`, [order])).rows[0]);
  });
}
