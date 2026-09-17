import { Request, Response } from "express";
import { tenantService } from "../services/tenant.service";
import { tenantListQuerySchema, createTenantSchema } from "../schemas/tenant.schema";

export const tenantController = {
  async list(req: Request, res: Response) {
    const query = tenantListQuerySchema.parse(req.query);
    const result = await tenantService.list(query);
    res.json(result);
  },

  async create(req: Request, res: Response) {
    const body = createTenantSchema.parse(req.body);
    const tenant = await tenantService.create(body);
    res.status(201).json(tenant);
  },
};
