import { Router } from "express";
import healthRouter from "./health.js";

// ─── Register routes here as you build them ───────────────────────────────────
// import workOrdersRouter from "./workOrders.js";
// import usersRouter      from "./users.js";
// import reservationsRouter from "./reservations.js";

const router = Router();

router.use(healthRouter);
// router.use("/work-orders", workOrdersRouter);
// router.use("/users",       usersRouter);
// router.use("/reservations", reservationsRouter);

export default router;
