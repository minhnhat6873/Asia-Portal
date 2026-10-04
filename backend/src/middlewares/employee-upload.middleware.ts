import type { NextFunction, Request, Response } from "express";

import { deleteCloudinaryAsset } from "../helpers/multerCloudinary.helper";
import { createEmployeeSchema, updateEmployeeSchema } from "../validates/admin/employee.validate";

export async function validateEmployeeCreateUpload(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const { error, value } = createEmployeeSchema.validate(request.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (!error) {
    request.body = value;
    next();
    return;
  }

  try {
    await deleteCloudinaryAsset(request.file?.filename);
  } catch {
    // Validation must still return the original 400 response.
  }

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
  const { error, value } = updateEmployeeSchema.validate(request.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (!error) {
    request.body = value;
    next();
    return;
  }

  try {
    await deleteCloudinaryAsset(request.file?.filename);
  } catch {
    // Validation must still return the original 400 response.
  }

  response.status(400).json({
    success: false,
    message: "D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7",
    errors: error.details.map((detail) => detail.message),
  });
}
