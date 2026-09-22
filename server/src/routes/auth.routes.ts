import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { oauthController } from "../controllers/oauth.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { loginLimiter, loginLimiterPerAccount } from "../middleware/rateLimit";

export const authRoutes = Router();

authRoutes.post("/login", loginLimiter, loginLimiterPerAccount, asyncHandler(authController.login));
authRoutes.get("/me", requireAuth, asyncHandler(authController.me));

// Optional Google sign-in (only offered when GOOGLE_* is configured).
authRoutes.get("/google", loginLimiter, oauthController.googleStart);
authRoutes.get("/google/callback", loginLimiter, asyncHandler(oauthController.googleCallback));
