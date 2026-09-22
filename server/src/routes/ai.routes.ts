import { Router } from "express";
import { aiAssistController } from "../controllers/aiAssist.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { requireTenant } from "../middleware/tenantContext";

export const aiRoutes = Router();

// One gate for every AI endpoint, so none can forget any of the three: a signed-in
// user, a tenant they belong to, and the per-user AI rate limit (each call is paid).
aiRoutes.use(requireAuth, requireTenant, aiLimiter);

aiRoutes.post("/parse-job-description", asyncHandler(aiAssistController.parseJobDescription));
aiRoutes.post("/candidates/:id/summary", asyncHandler(aiAssistController.candidateSummary));
aiRoutes.post("/job-orders/:id/outreach", asyncHandler(aiAssistController.outreach));
aiRoutes.post("/job-orders/:id/interview-questions", asyncHandler(aiAssistController.interviewQuestions));
aiRoutes.post("/candidate-search", asyncHandler(aiAssistController.candidateSearch));
aiRoutes.post("/dashboard-brief", asyncHandler(aiAssistController.dashboardBrief));
aiRoutes.post("/recommend-shortlist", asyncHandler(aiAssistController.recommendShortlist));
aiRoutes.post("/job-orders/:id/follow-up", asyncHandler(aiAssistController.followUp));
aiRoutes.post("/interviews/:id/message", asyncHandler(aiAssistController.interviewMessage));
