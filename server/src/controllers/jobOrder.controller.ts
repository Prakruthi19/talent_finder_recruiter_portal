import { Request, Response } from "express";
import { jobOrderService } from "../services/jobOrder.service";
import { aiInsightService } from "../services/aiInsight.service";
import {
  jobOrderListQuerySchema,
  createJobOrderSchema,
  updateJobOrderSchema,
} from "../schemas/jobOrder.schema";
import { shortlistCandidateSchema } from "../schemas/submission.schema";
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

export const jobOrderController = {
  async list(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const query = jobOrderListQuerySchema.parse(req.query);
    const result = await jobOrderService.list(tenantId, query);
    res.json(result);
  },

  async summary(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const result = await jobOrderService.summary(tenantId);
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const jobOrder = await jobOrderService.getById(tenantId, uuidParamSchema.parse(req.params.id));
    res.json(jobOrder);
  },

  async create(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const body = createJobOrderSchema.parse(req.body);
    const jobOrder = await jobOrderService.create({ tenantId, ...body });
    res.status(201).json(jobOrder);
  },

  async update(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const body = updateJobOrderSchema.parse(req.body);
    const jobOrder = await jobOrderService.update(tenantId, uuidParamSchema.parse(req.params.id), body);
    res.json(jobOrder);
  },

  async remove(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    await jobOrderService.delete(tenantId, uuidParamSchema.parse(req.params.id));
    res.status(204).send();
  },

  async matchingCandidates(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const result = await jobOrderService.matchingCandidates(tenantId, uuidParamSchema.parse(req.params.id));
    res.json({
      ...result,
      matchingCandidates: result.matchingCandidates.map((row) => ({ ...row, candidate: omitCvPath(row.candidate) })),
      shortlistedCandidates: result.shortlistedCandidates.map((row) => ({ ...row, candidate: omitCvPath(row.candidate) })),
    });
  },

  /** Optional AI bonus feature — see server/src/lib/aiProvider.ts */
  async generateInsight(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const { candidateId } = shortlistCandidateSchema.parse(req.body);
    const result = await aiInsightService.generateMatchInsight(
      tenantId,
      uuidParamSchema.parse(req.params.id),
      candidateId
    );
    res.json(result);
  },
};
