import type { QueryFilter, SortOrder } from "mongoose";

import type { CreateMediaInput, Media, UpdateMediaInput } from "../../interfaces/media.interface";
import MediaModel from "../../models/media.model";

interface FindMediaOptions {
  filter: QueryFilter<Media>;
  skip: number;
  limit: number;
  sort: Record<string, SortOrder>;
}

export const adminMediaRepository = {
  create(data: CreateMediaInput) {
    return MediaModel.create(data);
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

  updateById(id: string, data: UpdateMediaInput) {
    return MediaModel.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, data, {
      new: true,
      runValidators: true,
    }).lean();
  },

  permanentlyDeleteById(id: string) {
    return MediaModel.findOneAndDelete({ _id: id }).lean();
  },
};
