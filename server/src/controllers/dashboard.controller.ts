import { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";

export const dashboardController = {
  async overview(req: Request, res: Response) {
    res.json(await dashboardService.overview(req.tenantId!));
  },
};
