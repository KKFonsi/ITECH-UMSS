import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createOrder, updateOrder, orderId, listOrders, submitOrder, patchOrder } from "../services/workOrders.js";

const router = Router();
router.use(requireAuth);
router.get("/", requireRole("student", "technician", "admin", "superadmin"), async (req, res) => {
  const { limit, offset } = z.object({ limit: z.coerce.number().int().min(1).max(100).default(100), offset: z.coerce.number().int().min(0).default(0) }).parse(req.query);
  res.json({ workOrders: await listOrders(req.identity!, limit, offset) });
});
router.post("/", requireRole("student", "admin", "superadmin"), async (req, res) => {
  res.status(201).json({ workOrder: await submitOrder(req.identity!, createOrder.parse(req.body)) });
});
router.patch("/:id", requireRole("technician", "admin", "superadmin"), async (req, res) => {
  res.json({ workOrder: await patchOrder(req.identity!, orderId.parse(req.params.id), updateOrder.parse(req.body)) });
});
export default router;
