import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

import { AUTH_COOKIE_NAME } from "../config/auth.config";
import type { AdminRole } from "../interfaces/admin.interface";
import { adminRepository } from "../repositories/admin.repository";

interface AdminTokenPayload extends JwtPayload {
  name?: string;
  email?: string;
  role?: AdminRole;
}

export async function requireAdminAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = request.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
    const secret = process.env.JWT_SECRET?.trim();

    if (!token || !secret) {
      response.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để tiếp tục",
      });
      return;
    }

    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    if (!payload.sub || !mongoose.isValidObjectId(payload.sub)) {
      response.status(401).json({
        success: false,
        message: "Phiên đăng nhập không hợp lệ",
      });
      return;
    }

    const account = await adminRepository.findActiveById(payload.sub);
    if (!account) {
      response.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại hoặc đã bị khóa",
      });
      return;
    }

    request.admin = {
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      role: account.role,
    };

    next();
  } catch {
    response.status(401).json({
      success: false,
      message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ",
    });
  }
}