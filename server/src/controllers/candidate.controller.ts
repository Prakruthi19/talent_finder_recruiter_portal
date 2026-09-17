import { Request, Response } from "express";
import { candidateService } from "../services/candidate.service";
import {
  candidateListQuerySchema,
  createCandidateSchema,
  updateCandidateSchema,
} from "../schemas/candidate.schema";
import { AppError, NotFoundError } from "../lib/errors";

function requireTenantId(req: Request): string {
  if (!req.tenantId) throw new AppError("Tenant context missing", 400);
  return req.tenantId;
}

export const candidateController = {
  async list(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const query = candidateListQuerySchema.parse(req.query);
    const result = await candidateService.list(tenantId, query);
    res.json(result);
  },

  async summary(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const result = await candidateService.summary(tenantId);
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const candidate = await candidateService.getById(tenantId, req.params.id as string);
    res.json(candidate);
  },

  async create(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const body = createCandidateSchema.parse(req.body);
    const file = req.file;

    const candidate = await candidateService.create({
      tenantId,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      location: body.location,
      experienceYears: body.experienceYears,
      skills: body.skills,
      cvPath: file?.path,
      cvOriginalName: file?.originalname,
    });

    res.status(201).json(candidate);
  },

  async update(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const body = updateCandidateSchema.parse(req.body);
    const candidate = await candidateService.update(tenantId, req.params.id as string, body);
    res.json(candidate);
  },

  async remove(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    await candidateService.delete(tenantId, req.params.id as string);
    res.status(204).send();
  },

  async downloadCv(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const candidate = await candidateService.getById(tenantId, req.params.id as string);
    if (!candidate.cvPath) throw new NotFoundError("CV");
    res.download(candidate.cvPath, candidate.cvOriginalName ?? "cv");
  },
};
