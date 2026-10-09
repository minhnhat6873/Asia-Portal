import mongoose, { type QueryFilter } from "mongoose";

import type {
  CreateMediaInput,
  Media,
  MediaListQuery,
  UpdateMediaInput,
} from "../../interfaces/media.interface";
import { adminMediaRepository } from "../../repositories/admin/media.repository";
import { mediaAssetService } from "./media-asset.service";
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

function withoutInternalAssetReferences<T extends { contentAssetPublicIds?: string[] }>(media: T): T {
  const result = { ...media };
  delete (result as Partial<Media>).contentAssetPublicIds;
  return result;
}

async function getContentAssetIds(summary: string, content: string): Promise<string[]> {
  return mediaAssetService.findManagedPublicIds([summary, content]);
}

function storedAssetIds(media: Pick<Media, "contentAssetPublicIds" | "summary" | "content">): string[] {
  return media.contentAssetPublicIds ?? [];
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
      return { items: items.map(withoutInternalAssetReferences), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    const [items, total] = await Promise.all([
      adminMediaRepository.findAll({ filter, skip: (page - 1) * limit, limit, sort }),
      adminMediaRepository.count(filter),
    ]);

    return { items: items.map(withoutInternalAssetReferences), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getMediaById(id: string) {
    ensureValidId(id);
    const post = await adminMediaRepository.findById(id);
    if (!post) throw new AppError(404, "Không tìm thấy bài viết");
    return withoutInternalAssetReferences(post);
  },

  async createMedia(data: CreateMediaInput) {
    const sanitized = sanitizeContent(data);
    const contentAssetPublicIds = await getContentAssetIds(sanitized.summary, sanitized.content);
    await mediaAssetService.prepareForReference(contentAssetPublicIds);
    const post = await adminMediaRepository.create({ ...sanitized, contentAssetPublicIds });
    await mediaAssetService.synchronizeReferenceStatuses(contentAssetPublicIds);
    return withoutInternalAssetReferences(post);
  },

  async updateMedia(id: string, data: UpdateMediaInput) {
    ensureValidId(id);
    const sanitized = sanitizeContent(data);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const previous = await adminMediaRepository.findById(id);
      if (!previous) throw new AppError(404, "Không tìm thấy bài viết");

      const summary = sanitized.summary ?? previous.summary;
      const content = sanitized.content ?? previous.content;
      const [contentAssetPublicIds, legacyPreviousIds] = await Promise.all([
        getContentAssetIds(summary, content),
        getContentAssetIds(previous.summary, previous.content),
      ]);
      const previousAssetIds = [...new Set([...storedAssetIds(previous), ...legacyPreviousIds])];
      await mediaAssetService.prepareForReference(contentAssetPublicIds);
      const post = await adminMediaRepository.updateById(
        id,
        { ...sanitized, contentAssetPublicIds },
        previous.updatedAt,
      );
      if (!post) continue;
      await mediaAssetService.synchronizeReferenceStatuses([...previousAssetIds, ...contentAssetPublicIds]);
      return withoutInternalAssetReferences(post);
    }

    const current = await adminMediaRepository.findById(id);
    if (!current) throw new AppError(404, "Không tìm thấy bài viết");
    throw new AppError(409, "Bài viết vừa được cập nhật ở nơi khác. Vui lòng tải lại rồi thử lại.");
  },

  async permanentlyDeleteMedia(id: string) {
    ensureValidId(id);
    const previous = await adminMediaRepository.findById(id);
    const post = await adminMediaRepository.permanentlyDeleteById(id);
    if (!post) throw new AppError(404, "Không tìm thấy bài viết");
    const legacyIds = previous
      ? await getContentAssetIds(previous.summary, previous.content)
      : [];
    await mediaAssetService.synchronizeReferenceStatuses([...storedAssetIds(post), ...legacyIds]);
    return withoutInternalAssetReferences(post);
  },
};
