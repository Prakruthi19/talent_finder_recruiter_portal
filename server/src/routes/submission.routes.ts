import { Router } from "express";
import { submissionController } from "../controllers/submission.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireTenant } from "../middleware/tenantContext";

export const submissionRoutes = Router();

submissionRoutes.use(requireTenant);

submissionRoutes.get("/", asyncHandler(submissionController.list));
