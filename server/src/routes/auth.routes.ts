import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimit";

export const authRoutes = Router();

authRoutes.post("/login", loginLimiter, asyncHandler(authController.login));
authRoutes.get("/me", requireAuth, asyncHandler(authController.me));
