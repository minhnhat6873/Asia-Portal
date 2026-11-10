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
  if (
    error instanceof mongoose.mongo.MongoNetworkError ||
    error instanceof mongoose.mongo.MongoServerSelectionError ||
    error instanceof mongoose.Error.MongooseServerSelectionError ||
    error instanceof mongoose.mongo.MongoNotConnectedError ||
    error instanceof mongoose.mongo.MongoTopologyClosedError ||
    error instanceof mongoose.mongo.MongoServerClosedError ||
    (error instanceof mongoose.Error && /^Operation `[^`]+` buffering timed out after \d+ms$/.test(error.message))
  ) {
    response.setHeader("Cache-Control", "no-store");
    response.status(503).json({
      success: false,
      message: "Dịch vụ dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.",
    });
    return;
  }
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
        ? (error.field === "file" ? "File Excel tối đa 2 MB." : "Ảnh đại diện tối đa 5 MB.")
        : "Tải ảnh lên không thành công.",
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
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
    const field = duplicateError.keyPattern?.phoneKey || duplicateError.keyPattern?.phone ? "phone" : duplicateError.keyPattern?.email ? "email" : null;
    if (field) {
      const message = field === "phone" ? "Số điện thoại đã được sử dụng." : "Email đã được sử dụng.";
      response.status(409).json({ success: false, message, fieldErrors: { [field]: message } });
      return;
    }
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
