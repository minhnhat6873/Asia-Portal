import mongoose, { type QueryFilter, type SortOrder } from "mongoose";

import { MEDIA_FEATURED_LIMIT, type Media, type MediaListQuery } from "../../interfaces/media.interface";
import { userMediaRepository } from "../../repositories/user/media.repository";
import { AppError } from "../../utils/errors/AppError";
import { normalizeSearchText } from "../../utils/text/normalizeSearchText";
import { withMediaExpiry } from "../../utils/media/validateMediaDates";

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, "Mã bài viết không hợp lệ");
}

export const userMediaService = {
  /** Signed-in accounts only (the route requires login); every post is internal. */
  async getMedia(query: MediaListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
    const filter: QueryFilter<Media> = {};

    if (query.category) filter.category = query.category;
    if (String(query.featured) === "true") return this.getFeatured(filter, Math.min(limit, MEDIA_FEATURED_LIMIT));

    const sort: Record<string, SortOrder> = String(query.featured) === "true" ? { featuredSlot: 1, featuredAt: -1, _id: -1 } : { publishDate: query.sort === "oldest" ? 1 : -1 };
    const normalizedSearch = normalizeSearchText(query.search);
    if (normalizedSearch) {
      const matchingItems = (await userMediaRepository.findAllForSearch(filter, sort)).filter((post) =>
        normalizeSearchText(`${post.title} ${post.summary}`).includes(normalizedSearch),
      );
      const total = matchingItems.length;
      const items = matchingItems.slice((page - 1) * limit, page * limit);
      return { items: items.map(withMediaExpiry), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    const [items, total] = await Promise.all([
      userMediaRepository.findAll({ filter, skip: (page - 1) * limit, limit, sort }),
      userMediaRepository.count(filter),
    ]);
    return { items: items.map(withMediaExpiry), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  /**
   * Home page highlights: the chosen featured posts in slot order (at most 3). When fewer
   * are chosen (or none), the newest posts fill the remaining places.
   */
  async getFeatured(filter: QueryFilter<Media>, limit: number) {
    const chosen = (await userMediaRepository.findAll({ filter: { ...filter, featured: true }, skip: 0, limit: MEDIA_FEATURED_LIMIT * 3, sort: { featuredAt: -1, _id: -1 } }))
      .map((post) => ({ post, slot: post.featuredSlot && post.featuredSlot <= MEDIA_FEATURED_LIMIT ? post.featuredSlot : Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.slot - b.slot)
      .slice(0, limit)
      .map(({ post }) => post);
    const missing = limit - chosen.length;
    const fill = missing > 0
      ? await userMediaRepository.findAll({ filter: { ...filter, _id: { $nin: chosen.map((post) => post._id) } }, skip: 0, limit: missing, sort: { publishDate: -1, _id: -1 } })
      : [];
    const items = [...chosen, ...fill].map(withMediaExpiry);
    return { items, pagination: { page: 1, limit, total: items.length, totalPages: 1 } };
  },

  async getMediaById(id: string) {
    ensureValidId(id);
    const post = await userMediaRepository.findById(id);
    if (!post) throw new AppError(404, "Không tìm thấy bài viết");
    return withMediaExpiry(post);
  },
};

