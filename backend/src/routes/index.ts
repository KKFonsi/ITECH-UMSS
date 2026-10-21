import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import workOrdersRouter from "./workOrders.js";
import catalogRouter from "./catalog.js";

// ─── Register routes here as you build them ───────────────────────────────────
// import workOrdersRouter from "./workOrders.js";
// import usersRouter      from "./users.js";
// import reservationsRouter from "./reservations.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/work-orders", workOrdersRouter);
router.use(catalogRouter);
// router.use("/work-orders", workOrdersRouter);
// router.use("/users",       usersRouter);
// router.use("/reservations", reservationsRouter);

export default router;
