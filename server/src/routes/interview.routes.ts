import { Router } from "express";
import { interviewController } from "../controllers/interview.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenantContext";

export const interviewRoutes = Router();

interviewRoutes.use(requireAuth, requireTenant);

interviewRoutes.post("/", asyncHandler(interviewController.schedule));
interviewRoutes.patch("/:id", asyncHandler(interviewController.update));
