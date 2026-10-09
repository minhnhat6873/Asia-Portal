import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";

import { AppError } from "../utils/errors/AppError";

interface MongoDuplicateError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
}

export function globalErrorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if ((error as Error)?.message === "CORS_ORIGIN_NOT_ALLOWED") {
    response.status(403).json({
      success: false,
      message: "Origin này không được phép gọi API",
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Ảnh đại diện tối đa 5 MB."
        : "Tải ảnh lên không thành công.",
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({
      success: false,
      message: "Dữ liệu nhân viên không hợp lệ",
    });
    return;
  }

  if ((error as MongoDuplicateError)?.code === 11000) {
    const duplicateError = error as MongoDuplicateError;
    response.status(409).json({
      success: false,
      message: duplicateError.keyPattern?.rank
        ? "Công ty chỉ được có duy nhất một CEO"
        : "Email hoặc mã nhân viên đã tồn tại",
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    success: false,
    message: "Đã xảy ra lỗi trên máy chủ",
  });
}
