import type { MediaPost } from "@/features/admin/dashboard/types";
import { apiDelete, apiGet, apiPost, apiPatchFormData, apiPostFormData } from "./api";

export interface AdminMediaInput {
  title: string;
  category: MediaPost["category"];
  summary: string;
  content: string;
  coverImage?: string;
  authorDepartment: string;
  publishDate: string;
  expiryDate?: string | null;
  publishIndefinitely?: boolean;
  status?: MediaPost["status"];
}

interface ApiMedia extends Omit<MediaPost, "id" | "publishDate" | "expiryDate"> {
  _id: string;
  publishDate: string;
  expiryDate?: string | null;
  coverImagePublicId?: string;
}

export interface AdminMediaListParams {
  search?: string;
  category?: MediaPost["category"];
  status?: MediaPost["status"];
  page?: number;
  limit?: number;
  sort?: "latest" | "oldest";
}

export interface AdminMediaListResult {
  items: MediaPost[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function uploadAdminMediaContentImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("image", file);
  const result = await apiPostFormData<{ secureUrl: string }>("/admin/media/content-images", body);
  return result.secureUrl;
}

function formatDisplayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return [
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCFullYear()),
  ].join("/");
}

function formatApiDate(value: string): string {
  const [day, month, year] = value.split("/");
  return day && month && year ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : value;
}

function mapMedia(post: ApiMedia): MediaPost {
  const { _id, publishDate, expiryDate, ...rest } = post;
  return { ...rest, id: _id, publishDate: formatDisplayDate(publishDate), expiryDate: expiryDate ? formatDisplayDate(expiryDate) : null };
}

function buildFormData(input: Partial<AdminMediaInput>, coverFile: File | null): FormData {
  const body = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) { body.append(key, ""); return; }
    body.append(key, key === "publishDate" || key === "expiryDate" ? formatApiDate(String(value)) : String(value));
  });
  if (coverFile) body.append("coverImage", coverFile);
  return body;
}

export async function getAdminMedia(params: AdminMediaListParams = {}, signal?: AbortSignal): Promise<AdminMediaListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const result = await apiGet<{ items: ApiMedia[]; pagination: AdminMediaListResult["pagination"] }>(`/admin/media${query.size ? `?${query}` : ""}`, signal);
  return { ...result, items: result.items.map(mapMedia) };
}

export async function getAdminMediaById(id: string, signal?: AbortSignal): Promise<MediaPost> {
  return mapMedia(await apiGet<ApiMedia>(`/admin/media/${encodeURIComponent(id)}`, signal));
}

export async function createAdminMedia(input: AdminMediaInput, coverFile: File | null): Promise<MediaPost> {
  return mapMedia(await apiPostFormData<ApiMedia>("/admin/media", buildFormData(input, coverFile)));
}

export async function updateAdminMedia(id: string, input: Partial<AdminMediaInput>, coverFile: File | null = null): Promise<MediaPost> {
  return mapMedia(await apiPatchFormData<ApiMedia>(`/admin/media/${encodeURIComponent(id)}`, buildFormData(input, coverFile)));
}

export async function permanentlyDeleteAdminMedia(id: string): Promise<MediaPost> {
  return mapMedia(await apiDelete<ApiMedia>(`/admin/media/${encodeURIComponent(id)}/permanent`));
}

export async function softDeleteAdminMedia(id: string): Promise<MediaPost> {
  return mapMedia(await apiDelete<ApiMedia>(`/admin/media/${encodeURIComponent(id)}`));
}

export async function getDeletedAdminMedia(params: AdminMediaListParams = {}, signal?: AbortSignal): Promise<AdminMediaListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  const result = await apiGet<{ items: ApiMedia[]; pagination: AdminMediaListResult["pagination"] }>(`/admin/media/trash?${query}`, signal);
  return { ...result, items: result.items.map(mapMedia) };
}

export async function restoreAdminMedia(id: string): Promise<MediaPost> {
  return mapMedia(await apiPost<ApiMedia>(`/admin/media/${encodeURIComponent(id)}/restore`, {}));
}

