import type { NextFunction, Request, Response } from "express";
import type { SiteSettings } from "../../interfaces/site-settings.interface";
import { PUBLIC_NAVIGATION_SETTINGS_ID } from "../../interfaces/site-settings.interface";
import { siteSettingsService } from "../../services/site-settings.service";
import { auditLogService } from "../../services/admin/audit-log.service";

export async function updateSiteSettings(request: Request<unknown, unknown, SiteSettings>, response: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await siteSettingsService.update(request.body.internalSystemsEnabled);
    const actor = request.admin!;
    await auditLogService.record({
      actor: { accountId: actor.id, name: actor.name, email: actor.email },
      action: "site_settings.updated", entityType: "site_settings", entityId: PUBLIC_NAVIGATION_SETTINGS_ID,
      description: `${settings.internalSystemsEnabled ? "Hiện" : "Ẩn"} menu Hệ thống nội bộ WANA`, metadata: { after: settings },
    });
    response.setHeader("Cache-Control", "no-store");
    response.json({ success: true, message: "Đã lưu cài đặt hiển thị.", data: settings });
  } catch (error) { next(error); }
}
