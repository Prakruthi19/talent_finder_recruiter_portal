import { Router } from "express";
import { candidateController } from "../controllers/candidate.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireTenant } from "../middleware/tenantContext";
import { uploadCv, uploadCvMemory } from "../middleware/upload";

export const candidateRoutes = Router();

candidateRoutes.use(requireTenant);

candidateRoutes.get("/", asyncHandler(candidateController.list));
candidateRoutes.get("/summary", asyncHandler(candidateController.summary));
candidateRoutes.get("/:id", asyncHandler(candidateController.getById));
candidateRoutes.get("/:id/cv", asyncHandler(candidateController.downloadCv));
candidateRoutes.post("/", uploadCv.single("cv"), asyncHandler(candidateController.create));
candidateRoutes.post("/parse-cv", uploadCvMemory.single("cv"), asyncHandler(candidateController.parseCv));
candidateRoutes.patch("/:id", asyncHandler(candidateController.update));
candidateRoutes.delete("/:id", asyncHandler(candidateController.remove));
