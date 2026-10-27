import type { QueryFilter, SortOrder } from "mongoose";

import type { Media } from "../../interfaces/media.interface";
import MediaModel from "../../models/media.model";
import { getMediaExpiryCutoff } from "../../utils/media/validateMediaDates";

interface FindMediaOptions {
  filter: QueryFilter<Media>;
  skip: number;
  limit: number;
  sort: Record<string, SortOrder>;
}

const publicSelection = { createdBy: 0, coverImagePublicId: 0, contentAssetPublicIds: 0, deletedBy: 0, deletedAt: 0, isDeleted: 0 } as const;

function visibleMediaFilter(filter: QueryFilter<Media> = {}): QueryFilter<Media> {
  return {
    $and: [filter, {
      status: "published", isDeleted: { $ne: true },
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: getMediaExpiryCutoff() } },
        { publishIndefinitely: true },
      ],
    }],
  };
}

export const userMediaRepository = {
  findAllForSearch(filter: QueryFilter<Media>, sort: Record<string, SortOrder>) {
    return MediaModel.find(visibleMediaFilter(filter))
      .select(publicSelection)
      .sort(sort)
      .lean();
  },

  findAll({ filter, skip, limit, sort }: FindMediaOptions) {
    return MediaModel.find(visibleMediaFilter(filter))
      .select(publicSelection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  },

  count(filter: QueryFilter<Media>) {
    return MediaModel.countDocuments(visibleMediaFilter(filter));
  },

  findById(id: string) {
    return MediaModel.findOne(visibleMediaFilter({ _id: id }))
      .select(publicSelection)
      .lean();
  },
};

