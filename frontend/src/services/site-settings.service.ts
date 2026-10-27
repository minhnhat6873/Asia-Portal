import { apiGet, apiPatch } from "./api";

export interface SiteSettings { internalSystemsEnabled: boolean; }

export function getPublicSiteSettings(signal?: AbortSignal): Promise<SiteSettings> {
  return apiGet("/user/site-settings", signal);
}
export function getAdminSiteSettings(signal?: AbortSignal): Promise<SiteSettings> {
  return apiGet("/admin/site-settings", signal);
}
export function updateAdminSiteSettings(internalSystemsEnabled: boolean): Promise<SiteSettings> {
  return apiPatch("/admin/site-settings", { internalSystemsEnabled });
}
