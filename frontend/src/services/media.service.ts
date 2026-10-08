import type { NewsItem } from "@/config/news";
import { stripHtml } from "@/utils/stripHtml";
import { apiGet } from "./api";

interface ApiMedia {
  _id: string;
  title: string;
  category: NewsItem["category"];
  summary: string;
  content: string;
  coverImage: string;
  authorDepartment: string;
  publishDate: string;
  createdAt?: string;
  status: "published";
}

export interface PublicMediaListParams {
  search?: string;
  category?: NewsItem["category"];
  page?: number;
  limit?: number;
  sort?: "latest" | "oldest";
}

export interface PublicMediaListResult {
  items: NewsItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const FALLBACK_IMAGE = "/assets/images/truyenthong1.png";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function mapPublicMedia(post: ApiMedia, featured = false): NewsItem {
  return {
    id: post._id,
    title: post.title,
    excerpt: stripHtml(post.summary),
    summaryHtml: post.summary,
    content: post.content,
    category: post.category,
    date: formatDate(post.publishDate),
    createdAt: post.createdAt,
    author: post.authorDepartment,
    image: post.coverImage?.trim() || FALLBACK_IMAGE,
    featured,
  };
}

export async function getPublicMedia(params: PublicMediaListParams = {}, signal?: AbortSignal): Promise<PublicMediaListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const result = await apiGet<{ items: ApiMedia[]; pagination: PublicMediaListResult["pagination"] }>(`/user/media${query.size ? `?${query}` : ""}`, signal);
  return { ...result, items: result.items.map((post, index) => mapPublicMedia(post, index < 3)) };
}

export async function getPublicMediaById(id: string, signal?: AbortSignal): Promise<NewsItem> {
  return mapPublicMedia(await apiGet<ApiMedia>(`/user/media/${encodeURIComponent(id)}`, signal));
}
