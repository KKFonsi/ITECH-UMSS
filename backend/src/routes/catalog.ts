import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { pool } from "../lib/db.js";

const router = Router();
router.get("/locations", requireAuth, requireRole("student", "technician", "admin", "superadmin"), async (_req, res) => {
  const { rows } = await pool.query("SELECT id, concat_ws(' · ', building, room, floor) AS name, building AS campus FROM public.locations WHERE is_active = true ORDER BY building, room, floor LIMIT 1000");
  res.json({ locations: rows, freeText: true });
});
router.get("/technicians", requireAuth, requireRole("admin", "superadmin"), async (_req, res) => {
  const { rows } = await pool.query("SELECT id, full_name, zone FROM public.profiles WHERE role = 'technician' AND status = 'active' ORDER BY full_name");
  res.json({ technicians: rows });
});
export default router;
