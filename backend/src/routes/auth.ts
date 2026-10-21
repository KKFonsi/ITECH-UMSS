import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.get("/me", requireAuth, requireRole("student", "technician", "admin", "superadmin"), (req, res) => {
  res.json({ profile: req.identity });
});
export default router;
