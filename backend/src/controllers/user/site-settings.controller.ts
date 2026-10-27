import type { NextFunction, Request, Response } from "express";
import { siteSettingsService } from "../../services/site-settings.service";

export async function getPublicSiteSettings(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.setHeader("Cache-Control", "no-store");
    response.json({ success: true, data: await siteSettingsService.get() });
  } catch (error) { next(error); }
}
