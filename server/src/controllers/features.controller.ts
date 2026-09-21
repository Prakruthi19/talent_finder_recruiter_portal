import { Request, Response } from "express";
import { isAiConfigured } from "../lib/aiProvider";
import { getGoogleConfig } from "../lib/googleOAuth";

export const featuresController = {
  /**
   * Which optional features this server has configured, so the UI shows a
   * button only if it can work. Public and secret-free: booleans only.
   */
  get(_req: Request, res: Response) {
    res.json({ ai: isAiConfigured(), google: getGoogleConfig() !== null });
  },
};
