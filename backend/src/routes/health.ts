import { Router } from "express";
import { z } from "zod";

const router = Router();

const HealthCheckResponse = z.object({ status: z.string() });

/**
 * GET /api/healthz
 * Liveness probe used by Replit, Vercel, and load balancers.
 */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
