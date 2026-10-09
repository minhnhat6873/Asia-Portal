import { model, models, Schema } from "mongoose";

import {
  MEDIA_CATEGORIES,
  MEDIA_STATUSES,
  type Media,
} from "../interfaces/media.interface";

const mediaActorSchema = new Schema(
  {
    accountId: { type: String, trim: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false },
);

const mediaSchema = new Schema<Media>(
  {
    title: { type: String, required: true, trim: true, index: true },
    category: { type: String, enum: MEDIA_CATEGORIES, required: true, index: true },
    summary: { type: String, required: true, trim: true },
    content: { type: String, default: "", trim: true },
    contentAssetPublicIds: { type: [String], default: [] },
    coverImage: { type: String, default: "", trim: true },
    coverImagePublicId: { type: String, default: "", trim: true },
    authorDepartment: { type: String, required: true, trim: true },
    publishDate: { type: Date, required: true, index: true },
    status: { type: String, enum: MEDIA_STATUSES, default: "draft", index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: mediaActorSchema,
    createdBy: mediaActorSchema,
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "media_posts",
  },
);

mediaSchema.index({ contentAssetPublicIds: 1 });

const MediaModel = models.Media || model<Media>("Media", mediaSchema);

export default MediaModel;
