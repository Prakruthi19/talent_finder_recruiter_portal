import { Request, Response } from "express";
import { submissionService } from "../services/submission.service";
import { submissionListQuerySchema, shortlistCandidateSchema } from "../schemas/submission.schema";
import { AppError } from "../lib/errors";

function requireTenantId(req: Request): string {
  if (!req.tenantId) throw new AppError("Tenant context missing", 400);
  return req.tenantId;
}

export const submissionController = {
  async list(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const query = submissionListQuerySchema.parse(req.query);
    const result = await submissionService.list(tenantId, query);
    res.json(result);
  },

  async shortlist(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const { candidateId } = shortlistCandidateSchema.parse(req.body);
    const submission = await submissionService.shortlist(
      tenantId,
      req.params.jobOrderId as string,
      candidateId
    );
    res.status(201).json(submission);
  },
};
