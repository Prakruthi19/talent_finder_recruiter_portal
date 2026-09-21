import { Router } from "express";
import { jobOrderController } from "../controllers/jobOrder.controller";
import { submissionController } from "../controllers/submission.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { aiLimiter } from "../middleware/rateLimit";
import { requireAuth, requireRole } from "../middleware/auth";
import { requireTenant } from "../middleware/tenantContext";

export const jobOrderRoutes = Router();

jobOrderRoutes.use(requireAuth, requireTenant);

jobOrderRoutes.get("/", asyncHandler(jobOrderController.list));
jobOrderRoutes.get("/summary", asyncHandler(jobOrderController.summary));
jobOrderRoutes.get("/:id", asyncHandler(jobOrderController.getById));
jobOrderRoutes.post("/", asyncHandler(jobOrderController.create));
jobOrderRoutes.patch("/:id", asyncHandler(jobOrderController.update));
jobOrderRoutes.delete("/:id", requireRole("ADMIN"), asyncHandler(jobOrderController.remove));

jobOrderRoutes.get("/:id/matches", asyncHandler(jobOrderController.matchingCandidates));
jobOrderRoutes.post("/:jobOrderId/shortlist", asyncHandler(submissionController.shortlist));
jobOrderRoutes.post("/:id/insight", aiLimiter, asyncHandler(jobOrderController.generateInsight));
