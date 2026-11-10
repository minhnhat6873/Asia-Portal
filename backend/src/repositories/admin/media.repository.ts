import type { QueryFilter, SortOrder } from "mongoose";

import type { CreateMediaInput, Media, MediaActor, UpdateMediaInput } from "../../interfaces/media.interface";
import MediaModel from "../../models/media.model";
import { getMediaExpiryCutoff } from "../../utils/media/validateMediaDates";

interface FindMediaOptions {
  filter: QueryFilter<Media>;
  skip: number;
  limit: number;
  sort: Record<string, SortOrder>;
}

export const adminMediaRepository = {
  hideExpiredPosts() {
    return MediaModel.updateMany({
      status: "published",
      isDeleted: { $ne: true },
      publishIndefinitely: { $ne: true },
      showAfterExpiry: { $ne: true },
      expiryDate: { $lt: getMediaExpiryCutoff() },
    }, { $set: { status: "draft" } });
  },

  async create(data: CreateMediaInput & Pick<Media, "contentAssetPublicIds">) {
    const media = await MediaModel.create(data);
    return media.toObject();
  },

  findAll({ filter, skip, limit, sort }: FindMediaOptions) {
    return MediaModel.find(filter).sort(sort).skip(skip).limit(limit).lean();
  },

  findAllForSearch(filter: QueryFilter<Media>, sort: Record<string, SortOrder>) {
    return MediaModel.find(filter).sort(sort).lean();
  },

  count(filter: QueryFilter<Media>) {
    return MediaModel.countDocuments(filter);
  },

  findById(id: string) {
    return MediaModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
  },

  updateById(id: string, data: UpdateMediaInput & Pick<Media, "contentAssetPublicIds" | "showAfterExpiry">, expectedUpdatedAt?: Date) {
    return MediaModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}) },
      data,
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).lean();
  },

  softDeleteById(id: string, actor: MediaActor) {
    return MediaModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, status: "draft", showAfterExpiry: false, deletedAt: new Date(), deletedBy: actor } },
      { returnDocument: "after", runValidators: true },
    ).lean();
  },

  restoreById(id: string) {
    return MediaModel.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { $set: { isDeleted: false, status: "draft", showAfterExpiry: false, deletedAt: null }, $unset: { deletedBy: "" } },
      { returnDocument: "after", runValidators: true },
    ).lean();
  },

  permanentlyDeleteById(id: string) {
    return MediaModel.findOneAndDelete({ _id: id, isDeleted: true }).lean();
  },

  hasCoverReference(publicId: string, secureUrl?: string) {
    return MediaModel.exists({ $or: [
      { coverImagePublicId: publicId },
      ...(secureUrl ? [{ coverImage: secureUrl }] : []),
    ] });
  },

  hasContentAssetReference(publicId: string, secureUrl?: string) {
    const filters: QueryFilter<Media>[] = [{ contentAssetPublicIds: publicId }];
    if (secureUrl) {
      const escapedUrl = secureUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const imageUrlPattern = new RegExp(escapedUrl.replace(/&/g, "(?:&|&amp;)"));
      filters.push({ summary: imageUrlPattern }, { content: imageUrlPattern });
    }
    return MediaModel.exists({ $or: filters });
  },
};
