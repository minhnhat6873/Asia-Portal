import type { NextFunction, Request, Response } from "express";

import { deleteCloudinaryAsset } from "../helpers/multerCloudinary.helper";
import { createMediaSchema, updateMediaSchema } from "../validates/admin/media.validate";

async function validateMediaUpload(
  request: Request,
  response: Response,
  next: NextFunction,
  isUpdate: boolean,
): Promise<void> {
  const schema = isUpdate ? updateMediaSchema : createMediaSchema;
  const { error, value } = schema.validate(request.body, { abortEarly: false, stripUnknown: true });

  if (!error) {
    request.body = value;
    next();
    return;
  }

  try {
    await deleteCloudinaryAsset(request.file?.filename);
  } catch {
    // Validation response remains the source of truth.
  }

  response.status(400).json({
    success: false,
    message: "Dữ liệu bài viết không hợp lệ",
    errors: error.details.map((detail) => detail.message),
  });
}

export function validateMediaCreateUpload(request: Request, response: Response, next: NextFunction) {
  return validateMediaUpload(request, response, next, false);
}

export function validateMediaUpdateUpload(request: Request, response: Response, next: NextFunction) {
  return validateMediaUpload(request, response, next, true);
}

