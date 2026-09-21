import { Router } from "express";
import { auditController } from "../controllers/audit.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { requireTenant } from "../middleware/tenantContext";

export const auditRoutes = Router();

// The activity log names people and what they did, so it is for tenant admins only.
auditRoutes.use(requireAuth, requireTenant, requireRole("ADMIN"));
auditRoutes.get("/", asyncHandler(auditController.list));
