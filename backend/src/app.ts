import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { config } from "./config.js";
import { HttpError } from "./lib/errors.js";
import { ZodError } from "zod";

const app: Express = express();
app.disable("x-powered-by");

// ─── Logging ─────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ─── Security / parsing ───────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.origins,
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
  })
);

app.use(express.json({ limit: "32kb" }));
app.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", fields: [...new Set(err.issues.map(issue => issue.path.join(".")))] });
    return;
  }
  if (err instanceof SyntaxError && "body" in err) { res.status(400).json({ error: "Invalid JSON" }); return; }
  // SQL errors may contain submitted data, connection details or credentials.
  logger.error({ requestId: _req.id }, "Request failed");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
