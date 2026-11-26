import type { NextFunction, Request, Response } from "express";
import { siteSettingsService } from "../../services/site-settings.service";
import { isUserRegistrationEnabled } from "../../config/auth.config";

export async function getPublicSiteSettings(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.setHeader("Cache-Control", "no-store");
    response.json({ success: true, data: { ...await siteSettingsService.get(), userRegistrationEnabled: isUserRegistrationEnabled() } });
  } catch (error) { next(error); }
}
