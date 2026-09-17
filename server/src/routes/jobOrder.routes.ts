import { Router } from "express";
import { jobOrderController } from "../controllers/jobOrder.controller";
import { submissionController } from "../controllers/submission.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireTenant } from "../middleware/tenantContext";

export const jobOrderRoutes = Router();

jobOrderRoutes.use(requireTenant);

jobOrderRoutes.get("/", asyncHandler(jobOrderController.list));
jobOrderRoutes.get("/:id", asyncHandler(jobOrderController.getById));
jobOrderRoutes.post("/", asyncHandler(jobOrderController.create));
jobOrderRoutes.patch("/:id", asyncHandler(jobOrderController.update));
jobOrderRoutes.delete("/:id", asyncHandler(jobOrderController.remove));

jobOrderRoutes.get("/:id/matches", asyncHandler(jobOrderController.matchingCandidates));
jobOrderRoutes.post("/:jobOrderId/shortlist", asyncHandler(submissionController.shortlist));
