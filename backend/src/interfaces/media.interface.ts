export const MEDIA_CATEGORIES = ["Sự kiện", "Tin tức", "Nhân sự", "Thông báo"] as const;
export const MEDIA_STATUSES = ["published", "draft"] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export interface MediaActor {
  accountId: string;
  name: string;
  email: string;
}

export interface Media {
  title: string;
  category: MediaCategory;
  summary: string;
  content: string;
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
  "createdAt" | "updatedAt" | "isDeleted" | "deletedAt" | "deletedBy"
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

