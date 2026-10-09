export const MEDIA_CATEGORIES = ["Sự kiện", "Tin tức", "Nhân sự", "Thông báo"] as const;
export const MEDIA_STATUSES = ["published", "draft"] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export interface MediaActor {
  accountId: string;
  name: string;
  email: string;
}

export const MEDIA_ASSET_PROVIDERS = ["cloudinary"] as const;
export const MEDIA_ASSET_STATUSES = ["temporary", "active", "pending_delete"] as const;
export type MediaAssetProvider = (typeof MEDIA_ASSET_PROVIDERS)[number];
export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number];

export interface MediaAsset {
  publicId: string;
  secureUrl: string;
  provider: MediaAssetProvider;
  status: MediaAssetStatus;
  uploadedAt: Date;
  lastReferencedAt?: Date | null;
  pendingDeleteAt?: Date | null;
  deletionClaimId?: string | null;
  deletionClaimedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Media {
  title: string;
  category: MediaCategory;
  summary: string;
  content: string;
  contentAssetPublicIds?: string[];
  coverImage: string;
  coverImagePublicId?: string;
  authorDepartment: string;
  publishDate: Date;
  status: MediaStatus;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: MediaActor;
  createdBy?: MediaActor;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateMediaInput = Omit<
  Media,
  "createdAt" | "updatedAt" | "isDeleted" | "deletedAt" | "deletedBy" | "contentAssetPublicIds"
>;

export type UpdateMediaInput = Partial<CreateMediaInput>;

export interface MediaListQuery {
  search?: string;
  category?: MediaCategory;
  status?: MediaStatus;
  page?: string;
  limit?: string;
  sort?: "latest" | "oldest";
}

