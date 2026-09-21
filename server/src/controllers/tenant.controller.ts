import { Request, Response } from "express";
import { tenantService } from "../services/tenant.service";
import { tenantListQuerySchema, createTenantSchema } from "../schemas/tenant.schema";
import { getUserId } from "../middleware/auth";

export const tenantController = {
  async list(req: Request, res: Response) {
    const query = tenantListQuerySchema.parse(req.query);
    res.json(await tenantService.list(getUserId(req), query));
  },

  async create(req: Request, res: Response) {
    const body = createTenantSchema.parse(req.body);
    const tenant = await tenantService.create(getUserId(req), body);
    res.status(201).json(tenant);
  },

  async summary(req: Request, res: Response) {
    res.json(await tenantService.summary(getUserId(req)));
  },
};
