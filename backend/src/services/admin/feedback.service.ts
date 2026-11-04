import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import type { Feedback, FeedbackPatch, FeedbackQuery } from "../../interfaces/feedback.interface";
import { adminFeedbackRepository as repo } from "../../repositories/admin/feedback.repository";
import { AppError } from "../../utils/errors/AppError";
function valid(id: string) { if (!mongoose.isValidObjectId(id)) throw new AppError(400, "Mã đóng góp không hợp lệ."); }
function present(item: Feedback & { _id: unknown }) { return { id: String(item._id), title: item.title, content: item.content, sender: item.isAnonymous ? null : { name: item.senderName, email: item.senderEmail }, status: item.status, pinned: item.pinned, createdAt: item.createdAt }; }
export const adminFeedbackService = {
 async list(query: FeedbackQuery) { const page = Number(query.page) || 1, limit = Number(query.limit) || 5; const base: QueryFilter<Feedback> = { isDeleted: false }; const filter: QueryFilter<Feedback> = { ...base }; if (query.status && query.status !== "all") filter.status = query.status; if (query.q?.trim()) { const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); filter.$or = ["title", "contentText", "senderName", "senderEmail"].map(field => ({ [field]: { $regex: escaped, $options: "i" } })); } const [items, total, all, seen, pending] = await Promise.all([repo.list(filter, (page - 1) * limit, limit), repo.count(filter), repo.count(base), repo.count({ ...base, status: "seen" }), repo.count({ ...base, status: "pending" })]); return { items: items.map(present), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, stats: { total: all, seen, pending } }; },
 async detail(id: string) { valid(id); const changed = await repo.markSeen(id); const item = changed || await repo.find(id); if (!item) throw new AppError(404, "Không tìm thấy đóng góp."); return { item: present(item), changed: Boolean(changed) }; },
 async update(id: string, patch: FeedbackPatch) { valid(id); const changes = patch.pinned === true ? { ...patch, status: "seen" as const } : patch; const item = await repo.update(id, changes); if (!item) throw new AppError(404, "Không tìm thấy đóng góp."); return present(item); },
 async remove(id: string) { valid(id); const item = await repo.remove(id); if (!item) throw new AppError(404, "Không tìm thấy đóng góp."); },
};
