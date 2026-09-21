import { Request, Response } from "express";
import { auditService } from "../services/audit.service";
import { paginationQuerySchema } from "../schemas/common.schema";

export const auditController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    // requireTenant has already verified the caller belongs to this tenant.
    res.json(await auditService.list(req.tenantId!, { page, pageSize }));
  },
};
