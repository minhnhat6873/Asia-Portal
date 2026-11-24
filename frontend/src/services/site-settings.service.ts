import { apiGet, apiPatch } from "./api";

export interface SiteSettings { internalSystemsEnabled: boolean; }
// Public settings also say whether self-registration is open (USER_REGISTRATION_ENABLED on the backend).
export interface PublicSiteSettings extends SiteSettings { userRegistrationEnabled?: boolean; }

export function getPublicSiteSettings(signal?: AbortSignal): Promise<PublicSiteSettings> {
  return apiGet("/user/site-settings", signal);
}
export function getAdminSiteSettings(signal?: AbortSignal): Promise<SiteSettings> {
  return apiGet("/admin/site-settings", signal);
}
export function updateAdminSiteSettings(internalSystemsEnabled: boolean): Promise<SiteSettings> {
  return apiPatch("/admin/site-settings", { internalSystemsEnabled });
}
