import { Router } from "express";
import { tenantController } from "../controllers/tenant.controller";
import { asyncHandler } from "../middleware/asyncHandler";

export const tenantRoutes = Router();

tenantRoutes.get("/", asyncHandler(tenantController.list));
tenantRoutes.post("/", asyncHandler(tenantController.create));
