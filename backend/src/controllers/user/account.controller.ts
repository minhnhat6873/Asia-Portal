import type { NextFunction, Request, Response } from "express";

import { getAuthCookieOptions, getRememberCookieOptions } from "../../config/auth.config";
import { userAuthService } from "../../services/user/auth.service";
import { userProfileService } from "../../services/user/profile.service";
import { accountAvatarService } from "../../services/user/account-avatar.service";
import { AppError } from "../../utils/errors/AppError";
import { USER_ACCESS_COOKIE, USER_REFRESH_COOKIE } from "./auth.controller";

// Every route here runs after requireUserAuth, so request.user and request.userSession are set.

export async function getProfile(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.json({ success: true, data: await userProfileService.profile(request.user!) });
  } catch (error) { next(error); }
}

export async function changePassword(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const value = await userAuthService.changePassword(
      request.user!.id, request.userSession!, request.body.currentPassword, request.body.password,
      { ipAddress: request.ip, userAgent: request.get("User-Agent") },
    );
    // Every other device is signed out; this device gets a fresh session.
    response.cookie(USER_ACCESS_COOKIE, value.token, getAuthCookieOptions(value.persistent));
    response.cookie(USER_REFRESH_COOKIE, value.refreshToken, value.persistent ? { ...getRememberCookieOptions(), maxAge: value.remainingMs } : getAuthCookieOptions());
    response.json({ success: true, message: "Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất." });
  } catch (error) { next(error); }
}

export async function uploadAvatar(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const file = request.file as (Express.Multer.File & { path?: string; filename?: string }) | undefined;
    if (!file?.path || !file.filename) throw new AppError(400, "Vui lòng chọn ảnh đại diện.");
    const data = await accountAvatarService.set(request.user!.id, request.user!.email, { url: file.path, publicId: file.filename });
    response.json({ success: true, message: "Đã cập nhật ảnh đại diện.", data });
  } catch (error) { next(error); }
}

export async function removeAvatar(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const data = await accountAvatarService.clear(request.user!.id, request.user!.email);
    response.json({ success: true, message: "Đã dùng lại ảnh hồ sơ nhân sự.", data });
  } catch (error) { next(error); }
}

export async function logoutOtherDevices(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const count = await userAuthService.logoutOthers(request.user!.id, request.userSession!.id);
    response.json({
      success: true,
      message: count ? `Đã đăng xuất ${count} phiên trên các thiết bị khác.` : "Không có thiết bị nào khác đang đăng nhập.",
      data: { count },
    });
  } catch (error) { next(error); }
}
