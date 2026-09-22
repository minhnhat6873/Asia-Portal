import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

import { AppError } from "../utils/errors/AppError";

interface MongoDuplicateError extends Error {
  code?: number;
}

export function globalErrorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
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
    response.status(409).json({
      success: false,
      message: "Email hoặc mã nhân viên đã tồn tại",
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    success: false,
    message: "Đã xảy ra lỗi trên máy chủ",
  });
}