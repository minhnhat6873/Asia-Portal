import type { SiteSettings } from "../interfaces/site-settings.interface";
import { siteSettingsRepository } from "../repositories/site-settings.repository";
import { AppError } from "../utils/errors/AppError";

export const siteSettingsService = {
  async get(): Promise<SiteSettings> {
    const settings = await siteSettingsRepository.get();
    return { internalSystemsEnabled: settings?.internalSystemsEnabled === true };
  },
  async update(enabled: boolean): Promise<SiteSettings> {
    const settings = await siteSettingsRepository.setInternalSystemsEnabled(enabled);
    if (!settings) throw new AppError(500, "Không thể lưu cài đặt hiển thị. Vui lòng thử lại.");
    return { internalSystemsEnabled: settings.internalSystemsEnabled === true };
  },
};
