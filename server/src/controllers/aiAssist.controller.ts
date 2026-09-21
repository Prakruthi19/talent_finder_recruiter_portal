import { Request, Response } from "express";
import { z } from "zod";
import { aiAssistService } from "../services/aiAssist.service";
import { candidateIdSchema, candidateSearchSchema, outreachSchema, parseJobDescriptionSchema } from "../schemas/ai.schema";
import { getUserId } from "../middleware/auth";

const idParam = z.string().uuid();

// Every AI endpoint is mounted behind requireAuth + requireTenant + aiLimiter
// (routes/ai.routes.ts), so `req.tenantId` is always a tenant this user belongs to.
export const aiAssistController = {
  async parseJobDescription(req: Request, res: Response) {
    const { text } = parseJobDescriptionSchema.parse(req.body);
    res.json(await aiAssistService.parseJobDescription(text));
  },

  async candidateSummary(req: Request, res: Response) {
    res.json(await aiAssistService.summarizeCandidate(req.tenantId!, idParam.parse(req.params.id)));
  },

  async outreach(req: Request, res: Response) {
    const { candidateId, tone } = outreachSchema.parse(req.body);
    res.json(
      await aiAssistService.draftOutreach(req.tenantId!, getUserId(req), idParam.parse(req.params.id), candidateId, tone)
    );
  },

  async interviewQuestions(req: Request, res: Response) {
    const { candidateId } = candidateIdSchema.parse(req.body);
    res.json(await aiAssistService.interviewQuestions(req.tenantId!, idParam.parse(req.params.id), candidateId));
  },

  async candidateSearch(req: Request, res: Response) {
    const { query } = candidateSearchSchema.parse(req.body);
    res.json(await aiAssistService.searchCandidates(req.tenantId!, query));
  },

  async dashboardBrief(req: Request, res: Response) {
    res.json(await aiAssistService.dashboardBrief(req.tenantId!));
  },
};
