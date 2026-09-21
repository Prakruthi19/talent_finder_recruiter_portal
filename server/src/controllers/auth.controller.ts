import { Request, Response } from "express";
import { loginSchema } from "../schemas/auth.schema";
import * as authService from "../services/auth.service";
import { getUserId } from "../middleware/auth";

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    // A login has no req.user yet; this is how the audit trail learns who just signed in.
    res.locals.actorId = result.user.id;
    res.json(result);
  },

  async me(req: Request, res: Response) {
    res.json(await authService.getProfile(getUserId(req)));
  },
};
