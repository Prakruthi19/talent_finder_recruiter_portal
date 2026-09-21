import { Router } from "express";
import { candidateController } from "../controllers/candidate.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { uploadLimiter } from "../middleware/rateLimit";
import { requireAuth, requireRole } from "../middleware/auth";
import { requireTenant } from "../middleware/tenantContext";
import { uploadCv, uploadCvMemory } from "../middleware/upload";

export const candidateRoutes = Router();

candidateRoutes.use(requireAuth, requireTenant);

candidateRoutes.get("/", asyncHandler(candidateController.list));
candidateRoutes.get("/summary", asyncHandler(candidateController.summary));
candidateRoutes.get("/:id", asyncHandler(candidateController.getById));
candidateRoutes.get("/:id/cv", asyncHandler(candidateController.downloadCv));
candidateRoutes.post("/", uploadLimiter, uploadCv.single("cv"), asyncHandler(candidateController.create));
candidateRoutes.post("/parse-cv", uploadLimiter, uploadCvMemory.single("cv"), asyncHandler(candidateController.parseCv));
candidateRoutes.patch("/:id", asyncHandler(candidateController.update));
candidateRoutes.delete("/:id", requireRole("ADMIN"), asyncHandler(candidateController.remove));
