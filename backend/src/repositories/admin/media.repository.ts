import mongoose, { type ClientSession, type QueryFilter, type SortOrder } from "mongoose";

import type { CreateMediaInput, Media, MediaActor, UpdateMediaInput } from "../../interfaces/media.interface";
import MediaModel from "../../models/media.model";
import { getMediaExpiryCutoff } from "../../utils/media/validateMediaDates";
import { AppError } from "../../utils/errors/AppError";

async function withFeaturedLock<T>(action: (session: ClientSession, activatedAt: Date) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      await mongoose.connection.collection("media_featured_locks").updateOne(
        { _id: "featured" as unknown as mongoose.Types.ObjectId }, { $inc: { version: 1 } }, { upsert: true, session },
      );
      const latest = await MediaModel.findOne({ featured: true, status: "published", isDeleted: { $ne: true } }).sort({ featuredAt: -1 }).select({ featuredAt: 1 }).session(session).lean();
      const activatedAt = new Date(Math.max(Date.now(), (latest?.featuredAt?.getTime() ?? 0) + 1));
      result = await action(session, activatedAt);
    });
    return result;
  } catch (error) {
    if ((error as { code?: number }).code === 20 || (error as Error).message?.includes("Transaction numbers are only allowed")) {
      throw new AppError(503, "Cơ sở dữ liệu cần hỗ trợ giao dịch để quản lý bài nổi bật an toàn.");
    }
    throw error;
  } finally { await session.endSession(); }
}

const featuredVisibleFilter = () => ({ featured: true, status: "published", isDeleted: { $ne: true }, $or: [{ expiryDate: null }, { expiryDate: { $gte: getMediaExpiryCutoff() } }, { publishIndefinitely: true }, { showAfterExpiry: true }] });

function assignSlots<T extends { _id: unknown; title: string; featuredSlot?: number | null }>(posts: T[]) {
  const used = new Set<number>();
  const assigned = posts.map((post) => {
    const slot = post.featuredSlot;
    if (slot && slot >= 1 && slot <= 5 && !used.has(slot)) { used.add(slot); return { post, slot }; }
    return { post, slot: 0 };
  });
  for (const entry of assigned) {
    if (entry.slot) continue;
    const free = [1, 2, 3, 4, 5].find((slot) => !used.has(slot));
    if (!free) throw new AppError(409, "Dữ liệu nổi bật vượt quá 5 vị trí. Vui lòng tắt bớt bài nổi bật.");
    entry.slot = free; used.add(free);
  }
  return assigned;
}

async function ensureAvailableSlot(session: ClientSession, slot: number, currentId?: string) {
  const posts = await MediaModel.find(featuredVisibleFilter()).sort({ featuredAt: -1, _id: -1 }).select({ title: 1, featuredSlot: 1 }).session(session).lean();
  const assigned = assignSlots(posts);
  const occupant = assigned.find((entry) => entry.slot === slot && String(entry.post._id) !== currentId);
  if (occupant) throw new AppError(409, `Vị trí ${slot} đã được sử dụng. Vui lòng tắt bài đang chiếm vị trí này.`, { featuredSlot: `Vị trí ${slot} đã được sử dụng.` });
  for (const entry of assigned) {
    if (entry.post.featuredSlot !== entry.slot && String(entry.post._id) !== currentId) {
      await MediaModel.updateOne({ _id: entry.post._id }, { $set: { featuredSlot: entry.slot } }, { session });
    }
  }
}

interface FindMediaOptions {
  filter: QueryFilter<Media>;
  skip: number;
  limit: number;
  sort: Record<string, SortOrder>;
}

export const adminMediaRepository = {
  async hideExpiredPosts() {
    const result = await MediaModel.updateMany({
      status: "published",
      isDeleted: { $ne: true },
      publishIndefinitely: { $ne: true },
      showAfterExpiry: { $ne: true },
      expiryDate: { $lt: getMediaExpiryCutoff() },
    }, { $set: { status: "draft", hiddenReason: "expired", featured: false, featuredAt: null, featuredSlot: null } });
    await MediaModel.updateMany({ status: "draft", featured: true }, { $set: { featured: false, featuredAt: null, featuredSlot: null } });
    return result;
  },

  async create(data: CreateMediaInput & Pick<Media, "contentAssetPublicIds" | "hiddenReason">) {
    if (data.featured) return withFeaturedLock(async (session, activatedAt) => {
      if (!data.featuredSlot) throw new AppError(400, "Vui lòng chọn vị trí nổi bật từ 1 đến 5.");
      await ensureAvailableSlot(session, data.featuredSlot);
      const [media] = await MediaModel.create([{ ...data, featuredAt: activatedAt }], { session });
      return media.toObject();
    });
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

  async getFeaturedSlots() {
    const posts = await MediaModel.find(featuredVisibleFilter()).sort({ featuredAt: -1, _id: -1 }).select({ title: 1, featuredSlot: 1 }).lean();
    return assignSlots(posts).map(({ post, slot }) => ({ id: String(post._id), title: post.title, slot }));
  },

  activateFeaturedById(id: string, data: UpdateMediaInput & Pick<Media, "contentAssetPublicIds" | "showAfterExpiry" | "hiddenReason" | "featuredAt">, expectedUpdatedAt?: Date) {
    return withFeaturedLock(async (session, activatedAt) => {
      if (!data.featuredSlot) throw new AppError(400, "Vui lòng chọn vị trí nổi bật từ 1 đến 5.");
      await ensureAvailableSlot(session, data.featuredSlot, id);
      const post = await MediaModel.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true }, ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}) },
        { ...data, featuredAt: activatedAt }, { returnDocument: "after", runValidators: true, session },
      ).lean();
      return post;
    });
  },

  updateById(id: string, data: UpdateMediaInput & Pick<Media, "contentAssetPublicIds" | "showAfterExpiry" | "hiddenReason" | "featuredAt">, expectedUpdatedAt?: Date) {
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
      { $set: { isDeleted: true, status: "draft", hiddenReason: "manual", showAfterExpiry: false, featured: false, featuredAt: null, featuredSlot: null, deletedAt: new Date(), deletedBy: actor } },
      { returnDocument: "after", runValidators: true },
    ).lean();
  },

  restoreById(id: string) {
    return MediaModel.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { $set: { isDeleted: false, status: "draft", hiddenReason: "manual", showAfterExpiry: false, deletedAt: null }, $unset: { deletedBy: "" } },
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
