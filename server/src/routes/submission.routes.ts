import { Router } from "express";
import { submissionController } from "../controllers/submission.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenantContext";

export const submissionRoutes = Router();

submissionRoutes.use(requireAuth, requireTenant);

submissionRoutes.get("/", asyncHandler(submissionController.list));
submissionRoutes.get("/summary", asyncHandler(submissionController.summary));
