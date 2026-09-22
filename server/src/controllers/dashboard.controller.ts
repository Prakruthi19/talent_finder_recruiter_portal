import { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";

/** `cvPath` is the candidate's file path on the server's disk — not for the client. See candidate.controller.ts. */
function omitCvPath<T extends { cvPath?: string | null }>(candidate: T): Omit<T, "cvPath"> {
  const { cvPath: _cvPath, ...rest } = candidate;
  return rest;
}

export const dashboardController = {
  async overview(req: Request, res: Response) {
    const overview = await dashboardService.overview(req.tenantId!);
    res.json({
      ...overview,
      staleSubmission: overview.staleSubmission
        ? { ...overview.staleSubmission, candidate: omitCvPath(overview.staleSubmission.candidate) }
        : null,
    });
  },
};
