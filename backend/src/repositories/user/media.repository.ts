import type { QueryFilter, SortOrder } from "mongoose";

import type { Media } from "../../interfaces/media.interface";
import MediaModel from "../../models/media.model";

interface FindMediaOptions {
  filter: QueryFilter<Media>;
  skip: number;
  limit: number;
  sort: Record<string, SortOrder>;
}

const publicSelection = "-createdBy -coverImagePublicId -deletedBy -deletedAt -isDeleted";

export const userMediaRepository = {
  findAll({ filter, skip, limit, sort }: FindMediaOptions) {
    return MediaModel.find({ ...filter, status: "published", isDeleted: { $ne: true } })
      .select(publicSelection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  },

  count(filter: QueryFilter<Media>) {
    return MediaModel.countDocuments({ ...filter, status: "published", isDeleted: { $ne: true } });
  },

  findById(id: string) {
    return MediaModel.findOne({
      _id: id,
      status: "published",
      isDeleted: { $ne: true },
    })
      .select(publicSelection)
      .lean();
  },
};

