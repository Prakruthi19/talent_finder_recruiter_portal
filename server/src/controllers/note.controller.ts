import { Request, Response } from "express";
import { noteService } from "../services/note.service";
import { createNoteSchema } from "../schemas/note.schema";
import { uuidParamSchema } from "../schemas/common.schema";
import { getUserId } from "../middleware/auth";
import { AppError } from "../lib/errors";

function requireTenantId(req: Request): string {
  if (!req.tenantId) throw new AppError("Tenant context missing", 400);
  return req.tenantId;
}

export const noteController = {
  async listForCandidate(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const notes = await noteService.listForCandidate(tenantId, uuidParamSchema.parse(req.params.id));
    res.json(notes);
  },

  async addToCandidate(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const { body } = createNoteSchema.parse(req.body);
    const note = await noteService.addToCandidate(tenantId, getUserId(req), uuidParamSchema.parse(req.params.id), body);
    res.status(201).json(note);
  },

  async listForSubmission(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const notes = await noteService.listForSubmission(tenantId, uuidParamSchema.parse(req.params.id));
    res.json(notes);
  },

  async addToSubmission(req: Request, res: Response) {
    const tenantId = requireTenantId(req);
    const { body } = createNoteSchema.parse(req.body);
    const note = await noteService.addToSubmission(tenantId, getUserId(req), uuidParamSchema.parse(req.params.id), body);
    res.status(201).json(note);
  },
};
