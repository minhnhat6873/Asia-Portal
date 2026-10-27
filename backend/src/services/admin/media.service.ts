import mongoose, { type QueryFilter } from "mongoose";

import type {
  CreateMediaInput,
  Media,
  MediaActor,
  MediaListQuery,
  UpdateMediaInput,
} from "../../interfaces/media.interface";
import { adminMediaRepository } from "../../repositories/admin/media.repository";
import { mediaAssetService } from "./media-asset.service";
import { AppError } from "../../utils/errors/AppError";
import { sanitizeRichText, richTextToPlainText } from "../../utils/html/sanitizeRichText";
import { normalizeSearchText } from "../../utils/text/normalizeSearchText";
import { MEDIA_EXPIRED_PUBLISH_ERROR, validateMediaDates, withMediaExpiry } from "../../utils/media/validateMediaDates";
import { deleteCloudinaryAsset } from "../../helpers/multerCloudinary.helper";

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

function withoutInternalAssetReferences<T extends { contentAssetPublicIds?: string[]; expiryDate?: Date | null }>(media: T) {
  const result = { ...media };
  delete (result as Partial<Media>).contentAssetPublicIds;
  return withMediaExpiry(result);
}

async function getContentAssetIds(summary: string, content: string): Promise<string[]> {
  return mediaAssetService.findManagedPublicIds([summary, content]);
}

function storedAssetIds(media: Pick<Media, "contentAssetPublicIds" | "summary" | "content">): string[] {
  return media.contentAssetPublicIds ?? [];
}

export const adminMediaService = {
  async getMedia(query: MediaListQuery, deleted = false) {
    await adminMediaRepository.hideExpiredPosts();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
    const filter: QueryFilter<Media> = { isDeleted: deleted ? true : { $ne: true } };

    if (query.category) filter.category = query.category;
    if (!deleted && query.status) filter.status = query.status;

    const sort = { [deleted ? "deletedAt" : "publishDate"]: query.sort === "oldest" ? 1 as const : -1 as const };
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
    await adminMediaRepository.hideExpiredPosts();
    const post = await adminMediaRepository.findById(id);
    if (!post) throw new AppError(404, "Không tìm thấy bài viết");
    return withoutInternalAssetReferences(post);
  },

  async createMedia(data: CreateMediaInput) {
    if (!data.publishIndefinitely && !data.expiryDate) throw new AppError(400, "Vui lòng chọn ngày hết hạn hoặc chọn Đăng tin vĩnh viễn.");
    if (!data.publishIndefinitely) validateMediaDates(data.publishDate, data.expiryDate);
    if (data.status === "published" && withMediaExpiry(data).isExpired) {
      throw new AppError(400, MEDIA_EXPIRED_PUBLISH_ERROR);
    }
    const sanitized = sanitizeContent({ ...data, ...(data.publishIndefinitely ? { expiryDate: null } : {}) });
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

      const publishIndefinitely = sanitized.publishIndefinitely ?? previous.publishIndefinitely ?? false;
      const expiryDate = publishIndefinitely ? null : sanitized.expiryDate !== undefined ? sanitized.expiryDate : previous.expiryDate;
      // Old undated posts can still be hidden; saving or publishing requires a date.
      if (!publishIndefinitely && !expiryDate && !(Object.keys(sanitized).length === 1 && sanitized.status === "draft")) {
        throw new AppError(400, "Vui lòng chọn ngày hết hạn hoặc chọn Đăng tin vĩnh viễn.");
      }

      validateMediaDates(
        sanitized.publishDate ?? previous.publishDate,
        expiryDate,
      );
      const isExpired = withMediaExpiry({ expiryDate, publishIndefinitely }).isExpired;
      if (sanitized.status === "published" && isExpired) {
        throw new AppError(400, MEDIA_EXPIRED_PUBLISH_ERROR);
      }

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
        { ...sanitized, ...(publishIndefinitely ? { expiryDate: null } : {}), ...(isExpired ? { status: "draft" as const } : {}), contentAssetPublicIds },
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

  async softDeleteMedia(id: string, actor: MediaActor) {
    ensureValidId(id);
    const post = await adminMediaRepository.softDeleteById(id, actor);
    if (!post) throw new AppError(404, "Không tìm thấy bài viết hoặc bài đã ở trong thùng rác");
    return withoutInternalAssetReferences(post);
  },

  async restoreMedia(id: string) {
    ensureValidId(id);
    const post = await adminMediaRepository.restoreById(id);
    if (!post) throw new AppError(404, "Không tìm thấy bài viết trong thùng rác");
    return withoutInternalAssetReferences(post);
  },

  async cleanupCover(post: Pick<Media, "coverImagePublicId" | "coverImage">): Promise<void> {
    // Only delete a server-recorded upload from the media folder, never an ID parsed from a client URL.
    const publicId = post.coverImagePublicId;
    if (!publicId?.startsWith("asia-portal/media/") || publicId.includes("..")) return;
    try {
      if (!await adminMediaRepository.hasCoverReference(publicId, post.coverImage)) await deleteCloudinaryAsset(publicId);
    } catch {
      console.error("Không thể dọn ảnh bìa; cần kiểm tra asset Cloudinary.");
    }
  },

  async permanentlyDeleteMedia(id: string) {
    ensureValidId(id);
    const post = await adminMediaRepository.permanentlyDeleteById(id);
    if (!post) throw new AppError(404, "Chỉ có thể xóa vĩnh viễn bài viết trong thùng rác");
    try {
      const legacyIds = await getContentAssetIds(post.summary, post.content);
      await mediaAssetService.synchronizeReferenceStatuses([...storedAssetIds(post), ...legacyIds]);
    } catch {
      // The atomic deletion already succeeded; reconciliation can retry asset cleanup.
      console.error("Bài viết đã được xóa; cần đồng bộ lại tài nguyên truyền thông.");
    }
    return withoutInternalAssetReferences(post);
  },
};
