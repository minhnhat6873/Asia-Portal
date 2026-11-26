import type { Request, Response, NextFunction } from "express";
import { userAuthService } from "../../services/user/auth.service";
import { userAuthOtpService } from "../../services/user/auth-otp.service";
import { userProfileService } from "../../services/user/profile.service";
import { getAuthCookieOptions, getRememberCookieOptions } from "../../config/auth.config";
import { AppError } from "../../utils/errors/AppError";
import type { UserOtpPurpose } from "../../interfaces/user-auth.interface";

export const USER_ACCESS_COOKIE = "asia_user_token";
export const USER_REFRESH_COOKIE = "asia_user_refresh_token";
export async function loginUser(request: Request, response: Response, next: NextFunction) {
  try {
    const value = await userAuthService.login(request.body, { ipAddress: request.ip, userAgent: request.get("User-Agent") });
    const persistent = Boolean(request.body.rememberMe);
    response.cookie(USER_ACCESS_COOKIE, value.token, getAuthCookieOptions(persistent));
    response.cookie(USER_REFRESH_COOKIE, value.refreshToken, persistent ? getRememberCookieOptions() : getAuthCookieOptions());
    response.json({ success: true, data: value.admin });
  } catch (error) { next(error); }
}
export async function refreshUser(request: Request, response: Response, next: NextFunction) {
  try {
    const token = request.cookies?.[USER_REFRESH_COOKIE];
    if (typeof token !== "string") throw new AppError(401, "Bạn cần đăng nhập để tiếp tục.");
    const value = await userAuthService.refresh(token);
    response.cookie(USER_ACCESS_COOKIE, value.token, getAuthCookieOptions(value.persistent));
    response.cookie(USER_REFRESH_COOKIE, value.refreshToken, value.persistent ? { ...getRememberCookieOptions(), maxAge: value.remainingMs } : getAuthCookieOptions());
    response.json({ success: true, data: await userProfileService.summary(value.admin) });
  } catch (error) { next(error); }
}
export async function logoutUser(request: Request, response: Response, next: NextFunction) {
  try {
    await userAuthService.logout([request.cookies?.[USER_ACCESS_COOKIE], request.cookies?.[USER_REFRESH_COOKIE]]);
    response.clearCookie(USER_ACCESS_COOKIE, getAuthCookieOptions());
    response.clearCookie(USER_REFRESH_COOKIE, getAuthCookieOptions());
    response.json({ success: true });
  } catch (error) { next(error); }
}
export async function currentUser(request: Request, response: Response, next: NextFunction) {
  try {
    const token = request.cookies?.[USER_ACCESS_COOKIE];
    if (typeof token !== "string") throw new AppError(401, "Bạn cần đăng nhập để tiếp tục.");
    response.json({ success: true, data: await userProfileService.summary(await userAuthService.current(token)) });
  } catch (error) { next(error); }
}
export function userOtpAction(purpose: UserOtpPurpose, action: "start" | "resend" | "verify" | "reset") {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { email, code, password } = request.body;
      if (action === "start") {
        const data = await userAuthOtpService.start(email, purpose, purpose === "register" ? request.body : undefined);
        response.status(202).json({ success: true, message: "Nếu thông tin hợp lệ, mã xác thực sẽ được gửi đến email của bạn.", data });
      } else if (action === "resend") {
        response.json({ success: true, data: await userAuthOtpService.resend(email, purpose) });
      } else if (action === "verify") {
        await userAuthOtpService.verify(email, purpose, code);
        response.json({ success: true, message: purpose === "register" ? "Đăng ký thành công. Tài khoản đang chờ admin phê duyệt." : "Mã xác thực hợp lệ." });
      } else {
        await userAuthOtpService.reset(email, code, password);
        response.json({ success: true, message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
      }
    } catch (error) { next(error); }
  };
}
