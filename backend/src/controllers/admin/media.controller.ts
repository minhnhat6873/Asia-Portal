import type { NextFunction, Request, Response } from "express";

import { deleteCloudinaryAsset, getCloudinaryPublicIdFromUrl, uploadTinyMceImageToCloudinary } from "../../helpers/multerCloudinary.helper";
import { AppError } from "../../utils/errors/AppError";
import type { AuditAction } from "../../interfaces/audit-log.interface";
import type { CreateMediaInput, MediaListQuery, UpdateMediaInput } from "../../interfaces/media.interface";
import { auditLogService } from "../../services/admin/audit-log.service";
import { mediaAssetService } from "../../services/admin/media-asset.service";
import { adminMediaService } from "../../services/admin/media.service";

type CloudinaryUploadedFile = Express.Multer.File & { secure_url?: string };
type AuditedMedia = { _id?: unknown; title: string };

function getVerifiedImageFormat(file: Express.Multer.File): "jpg" | "png" | "webp" | "gif" {
  const buffer = file.buffer;
  const signatures: Record<string, { format: "jpg" | "png" | "webp" | "gif"; matches: (data: Buffer) => boolean }> = {
    "image/jpeg": { format: "jpg", matches: (data) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
    "image/png": { format: "png", matches: (data) => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    "image/webp": { format: "webp", matches: (data) => data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP" },
    "image/gif": { format: "gif", matches: (data) => data.toString("ascii", 0, 6) === "GIF87a" || data.toString("ascii", 0, 6) === "GIF89a" },
  };
  const signature = signatures[file.mimetype];
  if (!signature || !signature.matches(buffer)) {
    throw new AppError(400, "Định dạng hình ảnh không được hỗ trợ.");
  }
  return signature.format;
}

export async function uploadMediaContentImage(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const file = request.file;
    if (!file) throw new AppError(400, "Vui lòng chọn hình ảnh cần tải lên.");
    if (file.size > 5 * 1024 * 1024) throw new AppError(400, "Hình ảnh vượt quá dung lượng 5 MB.");
    const result = await uploadTinyMceImageToCloudinary(file.buffer, getVerifiedImageFormat(file));
    try {
      await mediaAssetService.registerTemporary({ publicId: result.public_id, secureUrl: result.secure_url });
    } catch (error) {
      try { await deleteCloudinaryAsset(result.public_id); } catch { /* preserve the asset registration error */ }
      throw error;
    }
    response.status(201).json({ success: true, message: "Tải hình ảnh thành công.", data: { secureUrl: result.secure_url } });
  } catch (error) {
    next(error);
  }
}

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

