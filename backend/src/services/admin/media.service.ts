import mongoose, { type QueryFilter } from "mongoose";

import type {
  CreateMediaInput,
  Media,
  MediaListQuery,
  UpdateMediaInput,
} from "../../interfaces/media.interface";
import { adminMediaRepository } from "../../repositories/admin/media.repository";
import { AppError } from "../../utils/errors/AppError";
import { sanitizeRichText, richTextToPlainText } from "../../utils/html/sanitizeRichText";
import { normalizeSearchText } from "../../utils/text/normalizeSearchText";

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Mã bài viết không hợp lệ");
  }
}

function sanitizeContent<T extends CreateMediaInput | UpdateMediaInput>(data: T): T {
  const next = { ...data };
  if (next.summary !== undefined) {
    next.summary = sanitizeRichText(next.summary);
    if (!richTextToPlainText(next.summary)) {
      throw new AppError(400, "Tóm tắt bài viết không được để trống");
    }
  }
  if (next.content !== undefined) next.content = sanitizeRichText(next.content);
  return next;
}

export const adminMediaService = {
  async getMedia(query: MediaListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
    const filter: QueryFilter<Media> = { isDeleted: { $ne: true } };

    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;

    const sort = { publishDate: query.sort === "oldest" ? 1 as const : -1 as const };
    const normalizedSearch = normalizeSearchText(query.search);
    if (normalizedSearch) {
      const matchingItems = (await adminMediaRepository.findAllForSearch(filter, sort)).filter((post) =>
        normalizeSearchText(`${post.title} ${post.summary}`).includes(normalizedSearch),
      );
      const total = matchingItems.length;
      const items = matchingItems.slice((page - 1) * limit, page * limit);
      return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    const [items, total] = await Promise.all([
      adminMediaRepository.findAll({ filter, skip: (page - 1) * limit, limit, sort }),
      adminMediaRepository.count(filter),
    ]);

    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getMediaById(id: string) {
    ensureValidId(id);
    const post = await adminMediaRepository.findById(id);
    if (!post) throw new AppError(404, "Không tìm thấy bài viết");
    return post;
  },

  createMedia(data: CreateMediaInput) {
    return adminMediaRepository.create(sanitizeContent(data));
  },

  async updateMedia(id: string, data: UpdateMediaInput) {
    ensureValidId(id);
    const post = await adminMediaRepository.updateById(id, sanitizeContent(data));
    if (!post) throw new AppError(404, "Không tìm thấy bài viết");
    return post;
  },

  async permanentlyDeleteMedia(id: string) {
    ensureValidId(id);
    const post = await adminMediaRepository.permanentlyDeleteById(id);
    if (!post) throw new AppError(404, "Không tìm thấy bài viết");
    return post;
  },
};
