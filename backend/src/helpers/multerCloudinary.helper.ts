import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import type { UploadApiResponse } from "cloudinary";

import { AppError } from "../utils/errors/AppError";

const allowedAvatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedContentImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function createImageStorage(folder: string): CloudinaryStorage {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    } as never,
  });
}

const avatarStorage = createImageStorage("asia-portal/avatars");
const mediaCoverStorage = createImageStorage("asia-portal/media");
const chartAvatarStorage = createImageStorage("asia-portal/chart-avatars");

function hasCloudinaryConfiguration(): boolean {
  return [
    process.env.CLOUDINARY_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ].every((value) => value?.trim());
}

export function requireCloudinaryConfig(
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  if (!hasCloudinaryConfiguration()) {
    next(new AppError(503, "Cloudinary chưa được cấu hình trên máy chủ."));
    return;
  }

  next();
}

export async function deleteCloudinaryAsset(publicId?: string): Promise<void> {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export function getCloudinaryPublicIdFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const pathname = new URL(url).pathname;
    const uploadMarker = "/image/upload/";
    const uploadIndex = pathname.indexOf(uploadMarker);
    if (uploadIndex < 0) return undefined;
    const uploadedPath = pathname.slice(uploadIndex + uploadMarker.length);
    const withoutVersion = uploadedPath.replace(/^v\d+\//, "");
    const extensionIndex = withoutVersion.lastIndexOf(".");
    const publicId = extensionIndex > 0 ? withoutVersion.slice(0, extensionIndex) : withoutVersion;
    return publicId ? decodeURIComponent(publicId) : undefined;
  } catch {
    return undefined;
  }
}

function createImageUploader(storage: CloudinaryStorage, checkConfiguration = false) {
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (checkConfiguration && !hasCloudinaryConfiguration()) {
        callback(new AppError(503, "Cloudinary chưa được cấu hình trên máy chủ."));
        return;
      }
      if (!allowedAvatarMimeTypes.has(file.mimetype)) {
        callback(new AppError(400, "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP."));
        return;
      }
      callback(null, true);
    },
  });
}

export const uploadAvatar = createImageUploader(avatarStorage);
export const uploadMediaCover = createImageUploader(mediaCoverStorage, true);
export const uploadChartAvatar = createImageUploader(chartAvatarStorage);

export const uploadTinyMceImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedContentImageMimeTypes.has(file.mimetype)) {
      callback(new AppError(400, "Định dạng hình ảnh không được hỗ trợ."));
      return;
    }
    callback(null, true);
  },
});

export function uploadTinyMceImageToCloudinary(
  buffer: Buffer,
  format: "jpg" | "png" | "webp" | "gif",
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: TINYMCE_CLOUDINARY_FOLDER,
        resource_type: "image",
        format,
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError(503, "Không thể tải hình ảnh lên Cloudinary. Vui lòng thử lại."));
          return;
        }
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

const TINYMCE_CLOUDINARY_FOLDER = "asia-portal/tinymce";

export function isManagedTinyMcePublicId(publicId: string): boolean {
  const prefix = `${TINYMCE_CLOUDINARY_FOLDER}/`;
  const suffix = publicId.startsWith(prefix) ? publicId.slice(prefix.length) : "";
  return suffix.length > 0 && !suffix.includes("..") && !/[\\\u0000-\u001f]/.test(publicId);
}

export async function destroyTinyMceCloudinaryAsset(publicId: string): Promise<{ result?: string }> {
  if (!isManagedTinyMcePublicId(publicId)) {
    throw new Error("Refusing to delete Cloudinary asset outside the TinyMCE folder.");
  }
  return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
