import { Request, Response } from "express";
import { loginSchema } from "../schemas/auth.schema";
import * as authService from "../services/auth.service";
import { getUserId } from "../middleware/auth";

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);
    res.json(await authService.login(email, password));
  },

  async me(req: Request, res: Response) {
    res.json(await authService.getProfile(getUserId(req)));
  },
};
