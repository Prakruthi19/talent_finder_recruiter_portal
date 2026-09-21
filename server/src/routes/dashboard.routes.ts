import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenantContext";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth, requireTenant);
dashboardRoutes.get("/", asyncHandler(dashboardController.overview));
