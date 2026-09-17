import { Request, Response } from "express";
import { jobOrderService } from "../services/jobOrder.service";
import { aiInsightService } from "../services/aiInsight.service";
import {
  jobOrderListQuerySchema,
  createJobOrderSchema,
  updateJobOrderSchema,
} from "../schemas/jobOrder.schema";
import { shortlistCandidateSchema } from "../schemas/submission.schema";
import { AppError } from "../lib/errors";

function requireTenantId(req: Request): string {
  if (!req.tenantId) throw new AppError("Tenant context missing", 400);
  return req.tenantId;
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
    const jobOrder = await jobOrderService.getById(tenantId, req.params.id as string);
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
    const jobOrder = await jobOrderService.update(tenantId, req.params.id as string, body);
    res.json(jobOrder);
  },

  async remove(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    await jobOrderService.delete(tenantId, req.params.id as string);
    res.status(204).send();
  },

  async matchingCandidates(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const result = await jobOrderService.matchingCandidates(tenantId, req.params.id as string);
    res.json(result);
  },

  /** Optional AI bonus feature — see server/src/lib/aiProvider.ts */
  async generateInsight(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const { candidateId } = shortlistCandidateSchema.parse(req.body);
    const result = await aiInsightService.generateMatchInsight(
      tenantId,
      req.params.id as string,
      candidateId
    );
    res.json(result);
  },
};
