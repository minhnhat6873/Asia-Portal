import type { NextFunction, Request, Response } from "express";

import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
} from "../../config/auth.config";
import type { LoginInput } from "../../interfaces/account.interface";
import { adminAuthService } from "../../services/admin/auth.service";

export async function login(
  request: Request<unknown, unknown, LoginInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { admin, token } = await adminAuthService.login(request.body);
    response.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    response.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: admin,
    });
  } catch (error) {
    next(error);
  }
}

export function logout(_request: Request, response: Response): void {
  const options = getAuthCookieOptions();
  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
  response.status(200).json({
    success: true,
    message: "Đăng xuất thành công",
  });
}

export function getCurrentAccount(request: Request, response: Response): void {
  response.status(200).json({
    success: true,
    data: request.admin,
  });
}
