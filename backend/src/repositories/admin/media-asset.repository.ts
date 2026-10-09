import type { MediaAsset } from "../../interfaces/media.interface";
import MediaAssetModel from "../../models/media-asset.model";

export const mediaAssetRepository = {
  registerTemporary(data: Pick<MediaAsset, "publicId" | "secureUrl">) {
    return MediaAssetModel.findOneAndUpdate(
      { publicId: data.publicId },
      {
        $setOnInsert: {
          ...data,
          provider: "cloudinary",
          status: "temporary",
          uploadedAt: new Date(),
          lastReferencedAt: null,
          pendingDeleteAt: null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
  },

  findBySecureUrls(secureUrls: string[]) {
    if (secureUrls.length === 0) return Promise.resolve([]);
    return MediaAssetModel.find({ provider: "cloudinary", secureUrl: { $in: secureUrls } })
      .select("publicId secureUrl")
      .lean();
  },

  findByPublicIds(publicIds: string[]) {
    if (publicIds.length === 0) return Promise.resolve([]);
    return MediaAssetModel.find({ provider: "cloudinary", publicId: { $in: publicIds } })
      .select("publicId secureUrl")
      .lean();
  },

  markActive(publicId: string, referencedAt: Date) {
    return MediaAssetModel.updateOne(
      { publicId, provider: "cloudinary" },
      {
        $set: { status: "active", lastReferencedAt: referencedAt },
        $unset: { pendingDeleteAt: 1, deletionClaimId: 1, deletionClaimedAt: 1 },
      },
    );
  },

  prepareForReference(publicId: string, referencedAt: Date) {
    return MediaAssetModel.updateOne(
      { publicId, provider: "cloudinary", deletionClaimId: { $exists: false } },
      {
        $set: { status: "active", lastReferencedAt: referencedAt },
        $unset: { pendingDeleteAt: 1, deletionClaimedAt: 1 },
      },
    );
  },

  markPendingDelete(publicId: string, pendingDeleteAt: Date) {
    return MediaAssetModel.updateOne(
      {
        publicId,
        provider: "cloudinary",
        deletionClaimId: { $exists: false },
        $or: [
          { lastReferencedAt: { $lte: pendingDeleteAt } },
          { lastReferencedAt: null },
          { lastReferencedAt: { $exists: false } },
        ],
      },
      { $set: { status: "pending_delete", pendingDeleteAt } },
    );
  },

  findCleanupCandidates(cutoff: Date, now: Date, expiredClaimBefore: Date, limit: number) {
    return MediaAssetModel.find({
      provider: "cloudinary",
      $and: [
        {
          $or: [
            { status: "temporary", uploadedAt: { $lte: cutoff } },
            { status: "pending_delete", pendingDeleteAt: { $lte: now } },
            { status: "active", lastReferencedAt: { $lte: cutoff } },
            { status: "active", lastReferencedAt: null, uploadedAt: { $lte: cutoff } },
          ],
        },
        {
          $or: [
            { deletionClaimId: { $exists: false } },
            { deletionClaimedAt: { $lte: expiredClaimBefore } },
          ],
        },
      ],
    })
      .select("publicId secureUrl status uploadedAt lastReferencedAt pendingDeleteAt deletionClaimId deletionClaimedAt")
      .sort({ uploadedAt: 1 })
      .limit(limit)
      .lean();
  },

  claimForDeletion(
    id: string,
    status: "temporary" | "pending_delete",
    now: Date,
    cutoff: Date,
    claimId: string,
    expiredClaimBefore: Date,
  ) {
    const dueFilter = status === "temporary"
      ? { uploadedAt: { $lte: cutoff } }
      : { pendingDeleteAt: { $lte: now } };
    return MediaAssetModel.findOneAndUpdate(
      {
        _id: id,
        provider: "cloudinary",
        status,
        ...dueFilter,
        $or: [
          { deletionClaimId: { $exists: false } },
          { deletionClaimedAt: { $lte: expiredClaimBefore } },
        ],
      },
      { $set: { deletionClaimId: claimId, deletionClaimedAt: now } },
      { new: true },
    )
      .select("publicId status deletionClaimId")
      .lean();
  },

  isDeletionClaimCurrent(id: string, claimId: string) {
    return MediaAssetModel.exists({ _id: id, provider: "cloudinary", deletionClaimId: claimId });
  },

  releaseDeletionClaim(id: string, claimId: string) {
    return MediaAssetModel.updateOne(
      { _id: id, deletionClaimId: claimId },
      { $unset: { deletionClaimId: 1, deletionClaimedAt: 1 } },
    );
  },

  deleteAfterCloudinaryConfirmation(id: string, claimId: string) {
    return MediaAssetModel.deleteOne({ _id: id, provider: "cloudinary", deletionClaimId: claimId });
  },
};
