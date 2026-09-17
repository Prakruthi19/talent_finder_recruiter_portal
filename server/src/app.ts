import express from "express";
import cors from "cors";
import { tenantRoutes } from "./routes/tenant.routes";
import { candidateRoutes } from "./routes/candidate.routes";
import { jobOrderRoutes } from "./routes/jobOrder.routes";
import { submissionRoutes } from "./routes/submission.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  // Vite falls back to the next free port (5174, 5175, ...) if 5173 is taken,
  // so allow any localhost/127.0.0.1 origin in dev rather than pinning one.
  const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || LOCALHOST_ORIGIN.test(origin) || origin === process.env.CLIENT_ORIGIN) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/tenants", tenantRoutes);
  app.use("/api/candidates", candidateRoutes);
  app.use("/api/job-orders", jobOrderRoutes);
  app.use("/api/submissions", submissionRoutes);

  app.use(errorHandler);

  return app;
}
