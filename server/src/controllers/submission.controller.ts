import { Request, Response } from "express";
import { submissionService } from "../services/submission.service";
import { submissionListQuerySchema, shortlistCandidateSchema } from "../schemas/submission.schema";
import { uuidParamSchema } from "../schemas/common.schema";
import { AppError } from "../lib/errors";

function requireTenantId(req: Request): string {
  if (!req.tenantId) throw new AppError("Tenant context missing", 400);
  return req.tenantId;
}

/** `cvPath` is the candidate's file path on the server's disk — not for the client. See candidate.controller.ts. */
function omitCvPath<T extends { cvPath?: string | null }>(candidate: T): Omit<T, "cvPath"> {
  const { cvPath: _cvPath, ...rest } = candidate;
  return rest;
}

function omitSubmissionCvPath<T extends { candidate: { cvPath?: string | null } }>(submission: T) {
  return { ...submission, candidate: omitCvPath(submission.candidate) };
}

export const submissionController = {
  async list(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const query = submissionListQuerySchema.parse(req.query);
    const result = await submissionService.list(tenantId, query);
    res.json({ ...result, items: result.items.map(omitSubmissionCvPath) });
  },

  async summary(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const result = await submissionService.summary(tenantId);
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const submission = await submissionService.getById(tenantId, uuidParamSchema.parse(req.params.id));
    res.json(omitSubmissionCvPath(submission));
  },

  async shortlist(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const { candidateId } = shortlistCandidateSchema.parse(req.body);
    const submission = await submissionService.shortlist(
      tenantId,
      uuidParamSchema.parse(req.params.jobOrderId),
      candidateId
    );
    res.status(201).json(omitSubmissionCvPath(submission));
  },
};
