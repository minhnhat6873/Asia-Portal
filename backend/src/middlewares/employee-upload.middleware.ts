import type { NextFunction, Request, Response } from "express";

import { uploadAvatar } from "../helpers/multerCloudinary.helper";
import { deleteEmployeeAvatarUploads, getEmployeeAvatarUploads } from "../utils/employee/avatarUploads";
import { createEmployeeSchema, updateEmployeeSchema } from "../validates/admin/employee.validate";

export function uploadEmployeeAvatars(request: Request, response: Response, next: NextFunction): void {
  uploadAvatar.fields([{ name: "avatar", maxCount: 1 }, { name: "avatarOriginal", maxCount: 1 }])(request, response, next);
}

async function rejectOriginalWithoutAvatar(request: Request, response: Response): Promise<boolean> {
  const { avatar, original } = getEmployeeAvatarUploads(request);
  if (!original || avatar) return false;
  await deleteEmployeeAvatarUploads(request);
  response.status(400).json({ success: false, message: "Ảnh gốc phải được gửi cùng ảnh đại diện." });
  return true;
}

export async function validateEmployeeCreateUpload(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  if (await rejectOriginalWithoutAvatar(request, response)) return;
  const { error, value } = createEmployeeSchema.validate(request.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (!error) {
    request.body = value;
    next();
    return;
  }

  await deleteEmployeeAvatarUploads(request);

  response.status(400).json({
    success: false,
    message: "D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7",
    errors: error.details.map((detail) => detail.message),
  });
}


export async function validateEmployeeUpdateUpload(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  if (await rejectOriginalWithoutAvatar(request, response)) return;
  const { error, value } = updateEmployeeSchema.validate(request.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (!error) {
    request.body = value;
    next();
    return;
  }

  await deleteEmployeeAvatarUploads(request);

  response.status(400).json({
    success: false,
    message: "D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7",
    errors: error.details.map((detail) => detail.message),
  });
}
