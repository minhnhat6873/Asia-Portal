import { model, models, Schema } from "mongoose";

import {
  MEDIA_ASSET_PROVIDERS,
  MEDIA_ASSET_STATUSES,
  type MediaAsset,
} from "../interfaces/media.interface";

const mediaAssetSchema = new Schema<MediaAsset>(
  {
    publicId: { type: String, required: true, trim: true, unique: true },
    secureUrl: { type: String, required: true, trim: true, unique: true },
    provider: { type: String, enum: MEDIA_ASSET_PROVIDERS, required: true, default: "cloudinary" },
    status: { type: String, enum: MEDIA_ASSET_STATUSES, required: true, default: "temporary", index: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
    lastReferencedAt: { type: Date, default: null },
    pendingDeleteAt: { type: Date, default: null },
    deletionClaimId: { type: String, select: false },
    deletionClaimedAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "media_assets",
  },
);

mediaAssetSchema.index({ status: 1, uploadedAt: 1 });
mediaAssetSchema.index({ status: 1, pendingDeleteAt: 1 });

const MediaAssetModel = models.MediaAsset || model<MediaAsset>("MediaAsset", mediaAssetSchema);

export default MediaAssetModel;
