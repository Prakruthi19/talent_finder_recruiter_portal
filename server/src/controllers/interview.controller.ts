import { Request, Response } from "express";
import { interviewService } from "../services/interview.service";
import { scheduleInterviewSchema, updateInterviewSchema } from "../schemas/interview.schema";
import { uuidParamSchema } from "../schemas/common.schema";
import { AppError } from "../lib/errors";

function requireTenantId(req: Request): string {
  if (!req.tenantId) throw new AppError("Tenant context missing", 400);
  return req.tenantId;
}

export const interviewController = {
  async schedule(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const { submissionId, scheduledAt, mode, notes } = scheduleInterviewSchema.parse(req.body);
    const interview = await interviewService.schedule(tenantId, submissionId, { scheduledAt, mode, notes });
    res.status(201).json(interview);
  },

  async update(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const body = updateInterviewSchema.parse(req.body);
    const interview = await interviewService.updateStatus(tenantId, uuidParamSchema.parse(req.params.id), body);
    res.json(interview);
  },
};
