import type { NextFunction, Request, Response } from "express";

import {
  AUTH_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
  getAuthCookieOptions,
  getRememberCookieOptions,
} from "../../config/auth.config";
import type { LoginInput } from "../../interfaces/account.interface";
import type { StartRegistrationInput, VerifyRegistrationOtpInput } from "../../interfaces/pending-registration.interface";
import type {
  ResetPasswordWithOtpInput,
  StartPasswordResetInput,
  VerifyPasswordResetOtpInput,
} from "../../interfaces/password-reset-otp.interface";import { adminAuthService } from "../../services/admin/auth.service";
import { registrationOtpService } from "../../services/user/registration-otp.service";

import { passwordResetOtpService } from "../../services/user/password-reset-otp.service";
function clearAuthCookie(response: Response, name: string): void {
  const options = getAuthCookieOptions();
  response.clearCookie(name, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

export async function login(
  request: Request<unknown, unknown, LoginInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { admin, token, refreshToken } = await adminAuthService.login(request.body);
    response.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(Boolean(refreshToken)));

    if (refreshToken) {
      response.cookie(AUTH_REFRESH_COOKIE_NAME, refreshToken, getRememberCookieOptions());
    } else {
      clearAuthCookie(response, AUTH_REFRESH_COOKIE_NAME);
    }

    response.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: admin,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshLogin(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = request.cookies?.[AUTH_REFRESH_COOKIE_NAME] as string | undefined;
    if (!refreshToken) {
      response.status(401).json({ success: false, message: "Bạn cần đăng nhập lại để tiếp tục" });
      return;
    }

    const { admin, token } = await adminAuthService.refresh(refreshToken);
    response.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(true));
    response.status(200).json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
}

export function logout(_request: Request, response: Response): void {
  clearAuthCookie(response, AUTH_COOKIE_NAME);
  clearAuthCookie(response, AUTH_REFRESH_COOKIE_NAME);
  response.status(200).json({ success: true, message: "Đăng xuất thành công" });
}

export function getCurrentAccount(request: Request, response: Response): void {
  response.status(200).json({ success: true, data: request.admin });
}

export async function register(
  request: Request<unknown, unknown, StartRegistrationInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const registration = await registrationOtpService.start(request.body);
    response.status(202).json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn.",
      data: registration,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyRegistrationOtp(
  request: Request<unknown, unknown, VerifyRegistrationOtpInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const account = await registrationOtpService.verify(request.body);
    response.status(201).json({
      success: true,
      message: "Xác thực email thành công. Tài khoản đang chờ admin phê duyệt.",
      data: account,
    });
  } catch (error) {
    next(error);
  }
}

export async function resendRegistrationOtp(
  request: Request<unknown, unknown, Pick<VerifyRegistrationOtpInput, "email">>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await registrationOtpService.resend(request.body.email);
    response.status(200).json({
      success: true,
      message: "Mã OTP mới đã được gửi đến email của bạn.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
export async function requestPasswordResetOtp(
  request: Request<unknown, unknown, StartPasswordResetInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await passwordResetOtpService.start(request.body);
    response.status(202).json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyPasswordResetOtp(
  request: Request<unknown, unknown, VerifyPasswordResetOtpInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await passwordResetOtpService.verify(request.body);
    response.status(200).json({ success: true, message: "Mã OTP hợp lệ." });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordWithOtp(
  request: Request<unknown, unknown, ResetPasswordWithOtpInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await passwordResetOtpService.reset(request.body);
    response.status(200).json({ success: true, message: "Đặt lại mật khẩu thành công." });
  } catch (error) {
    next(error);
  }
}

export async function resendPasswordResetOtp(
  request: Request<unknown, unknown, StartPasswordResetInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await passwordResetOtpService.resend(request.body.email);
    response.status(200).json({
      success: true,
      message: "Mã OTP mới đã được gửi đến email của bạn.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}