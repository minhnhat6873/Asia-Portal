import mongoose, { type QueryFilter } from "mongoose";

import type { Media, MediaListQuery } from "../../interfaces/media.interface";
import { userMediaRepository } from "../../repositories/user/media.repository";
import { AppError } from "../../utils/errors/AppError";
import { escapeRegex } from "../../utils/regex/escapeRegex";

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, "Mã bài viết không hợp lệ");
}

export const userMediaService = {
  async getMedia(query: MediaListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
    const filter: QueryFilter<Media> = {};

    if (query.search?.trim()) {
      const keyword = new RegExp(escapeRegex(query.search.trim()), "i");
      filter.$or = [{ title: keyword }, { authorDepartment: keyword }];
    }
    if (query.category) filter.category = query.category;

    const sort = { publishDate: query.sort === "oldest" ? 1 as const : -1 as const };
    const [items, total] = await Promise.all([
      userMediaRepository.findAll({ filter, skip: (page - 1) * limit, limit, sort }),
      userMediaRepository.count(filter),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getMediaById(id: string) {
    ensureValidId(id);
    const post = await userMediaRepository.findById(id);
    if (!post) throw new AppError(404, "Không tìm thấy bài viết");
    return post;
  },
};

