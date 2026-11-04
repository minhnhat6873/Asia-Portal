import { apiDelete, apiGet, apiPatch } from "./api";
import type { FeedbackItem, FeedbackStatus } from "@/features/admin/feedback/feedback.types";
export interface FeedbackPage { items: FeedbackItem[]; pagination: { page: number; limit: number; total: number; totalPages: number }; stats: { total: number; seen: number; pending: number } }
export const FEEDBACK_PAGE_SIZE = 10;
export function listFeedback(page: number, q: string, status: string, signal?: AbortSignal) { const params = new URLSearchParams({ page: String(page), limit: String(FEEDBACK_PAGE_SIZE), q, status }); return apiGet<FeedbackPage>(`/admin/feedback?${params}`, signal); }
export function getFeedback(id: string) { return apiGet<FeedbackItem>(`/admin/feedback/${encodeURIComponent(id)}`); }
export function updateFeedback(id: string, patch: { status?: FeedbackStatus; pinned?: boolean }) { return apiPatch<FeedbackItem>(`/admin/feedback/${encodeURIComponent(id)}`, patch); }
export function deleteFeedback(id: string) { return apiDelete<void>(`/admin/feedback/${encodeURIComponent(id)}`); }
