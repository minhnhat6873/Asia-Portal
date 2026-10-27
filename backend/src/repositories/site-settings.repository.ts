import SiteSettingsModel from "../models/site-settings.model";
import { PUBLIC_NAVIGATION_SETTINGS_ID } from "../interfaces/site-settings.interface";

export const siteSettingsRepository = {
  get() {
    return SiteSettingsModel.findById(PUBLIC_NAVIGATION_SETTINGS_ID).select({ internalSystemsEnabled: 1, _id: 0 }).lean();
  },
  setInternalSystemsEnabled(enabled: boolean) {
    return SiteSettingsModel.findOneAndUpdate(
      { _id: PUBLIC_NAVIGATION_SETTINGS_ID },
      { $set: { internalSystemsEnabled: enabled } },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).select({ internalSystemsEnabled: 1, _id: 0 }).lean();
  },
};
