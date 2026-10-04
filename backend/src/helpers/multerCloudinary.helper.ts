import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { CloudinaryStorage } from "multer-storage-cloudinary";

import { AppError } from "../utils/errors/AppError";

const allowedAvatarMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "asia-portal/avatars",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  } as never,
});

export function requireCloudinaryConfig(
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const hasConfiguration = [
    process.env.CLOUDINARY_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ].every((value) => value?.trim());

  if (!hasConfiguration) {
    next(new AppError(503, "Cloudinary ch\u01b0a \u0111\u01b0\u1ee3c c\u1ea5u h\u00ecnh tr\u00ean m\u00e1y ch\u1ee7."));
    return;
  }

  next();
}

export async function deleteCloudinaryAsset(publicId?: string): Promise<void> {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!allowedAvatarMimeTypes.has(file.mimetype)) {
      callback(new AppError(400, "Ch\u1ec9 ch\u1ea5p nh\u1eadn \u1ea3nh JPEG, PNG ho\u1eb7c WebP."));
      return;
    }

    callback(null, true);
  },
});
