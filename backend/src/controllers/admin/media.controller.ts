import type { NextFunction, Request, Response } from "express";

import { deleteCloudinaryAsset, getCloudinaryPublicIdFromUrl } from "../../helpers/multerCloudinary.helper";
import type { AuditAction } from "../../interfaces/audit-log.interface";
import type { CreateMediaInput, MediaListQuery, UpdateMediaInput } from "../../interfaces/media.interface";
import { auditLogService } from "../../services/admin/audit-log.service";
import { adminMediaService } from "../../services/admin/media.service";

type CloudinaryUploadedFile = Express.Multer.File & { secure_url?: string };
type AuditedMedia = { _id?: unknown; title: string };

async function recordMediaAudit(
  admin: Request["admin"],
  action: AuditAction,
  post: AuditedMedia,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!admin) return;
  await auditLogService.record({
    actor: { accountId: admin.id, name: admin.name, email: admin.email },
    action,
    entityType: "media",
    entityId: String(post._id ?? ""),
    description: post.title,
    metadata,
  });
}

export async function getMedia(request: Request<unknown, unknown, unknown, MediaListQuery>, response: Response, next: NextFunction): Promise<void> {
  try {
    response.status(200).json({ success: true, data: await adminMediaService.getMedia(request.query) });
  } catch (error) { next(error); }
}

export async function getMediaById(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    response.status(200).json({ success: true, data: await adminMediaService.getMediaById(request.params.id) });
  } catch (error) { next(error); }
}

export async function createMedia(request: Request<unknown, unknown, CreateMediaInput>, response: Response, next: NextFunction): Promise<void> {
  const uploadedFile = request.file as CloudinaryUploadedFile | undefined;
  try {
    const post = await adminMediaService.createMedia({
      ...request.body,
      coverImage: uploadedFile?.secure_url ?? uploadedFile?.path ?? request.body.coverImage ?? "",
      coverImagePublicId: uploadedFile?.filename ?? "",
      createdBy: request.admin ? { accountId: request.admin.id, name: request.admin.name, email: request.admin.email } : undefined,
    });
    await recordMediaAudit(request.admin, "media.created", post);
    response.status(201).json({ success: true, message: "Tạo bài viết thành công", data: post });
  } catch (error) {
    try { await deleteCloudinaryAsset(uploadedFile?.filename); } catch { /* preserve original error */ }
    next(error);
  }
}

export async function updateMedia(request: Request<{ id: string }, unknown, UpdateMediaInput>, response: Response, next: NextFunction): Promise<void> {
  const uploadedFile = request.file as CloudinaryUploadedFile | undefined;
  try {
    const previous = uploadedFile ? await adminMediaService.getMediaById(request.params.id) : undefined;
    const post = await adminMediaService.updateMedia(
      request.params.id,
      uploadedFile
        ? { ...request.body, coverImage: uploadedFile.secure_url ?? uploadedFile.path, coverImagePublicId: uploadedFile.filename }
        : request.body,
    );
    const previousPublicId = previous?.coverImagePublicId || getCloudinaryPublicIdFromUrl(previous?.coverImage);
    if (uploadedFile && previousPublicId) {
      try { await deleteCloudinaryAsset(previousPublicId); } catch (cleanupError) { console.error("Không thể xóa ảnh bìa cũ trên Cloudinary", cleanupError); }
    }
    await recordMediaAudit(request.admin, "media.updated", post, { changedFields: Object.keys(request.body), coverImageChanged: Boolean(uploadedFile) });
    response.status(200).json({ success: true, message: "Cập nhật bài viết thành công", data: post });
  } catch (error) {
    try { await deleteCloudinaryAsset(uploadedFile?.filename); } catch { /* preserve original error */ }
    next(error);
  }
}

export async function permanentlyDeleteMedia(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    const post = await adminMediaService.permanentlyDeleteMedia(request.params.id);
    const publicId = post.coverImagePublicId || getCloudinaryPublicIdFromUrl(post.coverImage);
    if (publicId) {
      try { await deleteCloudinaryAsset(publicId); } catch (cleanupError) { console.error("Không thể xóa ảnh bìa trên Cloudinary", cleanupError); }
    }
    await recordMediaAudit(request.admin, "media.permanently_deleted", post);
    response.status(200).json({ success: true, message: "Đã xóa vĩnh viễn bài viết", data: post });
  } catch (error) { next(error); }
}

