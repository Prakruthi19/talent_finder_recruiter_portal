import { Router } from "express";
import { tenantController } from "../controllers/tenant.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const tenantRoutes = Router();

// Tenants are listed per signed-in user (their memberships), not per X-Tenant-Id.
tenantRoutes.use(requireAuth);

tenantRoutes.get("/", asyncHandler(tenantController.list));
tenantRoutes.get("/summary", asyncHandler(tenantController.summary));
tenantRoutes.post("/", asyncHandler(tenantController.create));
