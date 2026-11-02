import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

import type {
  ResetPasswordWithOtpInput,
  StartPasswordResetInput,
  VerifyPasswordResetOtpInput,
} from "../../interfaces/password-reset-otp.interface";
import { passwordResetOtpRepository } from "../../repositories/admin/password-reset-otp.repository";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { emailService } from "../notification/email.service";
import { AppError } from "../../utils/errors/AppError";
import { OTP_EXPIRY_MS, OTP_RESEND_COOLDOWN_MS, MAX_OTP_ATTEMPTS, MAX_RESEND_COUNT } from "../../config/otp.config";

function getOtpSecret(): string {
  const secret = process.env.OTP_SECRET?.trim();
  if (!secret) throw new AppError(500, "Máy chủ chưa cấu hình bảo mật OTP.");
  return secret;
}

function createOtpCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

function hashOtp(email: string, code: string, requestId?: string): string {
  return createHmac("sha256", getOtpSecret())
    .update(requestId ? `password-reset:${email.toLowerCase()}:${requestId}:${code}` : `password-reset:${email.toLowerCase()}:${code}`)
    .digest("hex");
}

function isOtpMatch(expectedHash: string, submittedHash: string): boolean {
  const expected = Buffer.from(expectedHash, "hex"), submitted = Buffer.from(submittedHash, "hex");
  return expected.length === submitted.length && timingSafeEqual(expected, submitted);
}

async function getValidOtp(email: string) {
  const pending = await passwordResetOtpRepository.findByEmail(email);
  if (!pending || pending.otpExpiresAt <= new Date()) {
    if (pending) await passwordResetOtpRepository.deleteRequest(pending);
    throw new AppError(400, "Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.");
  }

  return pending;
}

async function assertOtpMatches(email: string, code: string) {
  const pending = await getValidOtp(email);
  if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.");
  }

  if (!isOtpMatch(pending.otpHash, hashOtp(email, code, pending.requestId))) {
    const failed = await passwordResetOtpRepository.incrementAttempts(pending, new Date());
    if (!failed || failed.otpAttempts >= MAX_OTP_ATTEMPTS) {
      throw new AppError(429, "Mã OTP đã thay đổi, hết hạn hoặc vượt số lần nhập. Vui lòng yêu cầu mã mới.");
    }
    const remainingAttempts = MAX_OTP_ATTEMPTS - failed.otpAttempts;
    throw new AppError(400, `Mã OTP không chính xác. Bạn còn ${remainingAttempts} lần thử.`);
  }

  return pending;
}

export const passwordResetOtpService = {
  async start({ email: rawEmail }: StartPasswordResetInput): Promise<{ email: string; expiresInSeconds: number }> {
    const email = rawEmail.toLowerCase();
    const account = await adminAccountRepository.findByEmail(email);
    if (!account) throw new AppError(404, "Không tìm thấy tài khoản với email này.");

    const code = createOtpCode(), requestId = randomUUID();
    const now = new Date();
    const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

    const otpHash = hashOtp(email, code, requestId);
    let pending;
    try {
      pending = await passwordResetOtpRepository.reserve({
        email, requestId, otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
        resendCount: 0,
      }, now);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError(429, "Vui lòng chờ 60 giây trước khi yêu cầu mã OTP mới.");
      throw error;
    }
    if (!pending) throw new AppError(409, "Không thể tạo yêu cầu OTP. Vui lòng thử lại.");

    try {
      await emailService.sendPasswordResetOtp(email, code);
    } catch (error) {
      await passwordResetOtpRepository.deleteRequest({ email, requestId, otpHash });
      throw error;
    }

    return { email, expiresInSeconds: OTP_EXPIRY_MS / 1000 };
  },

  async verify({ email: rawEmail, code }: VerifyPasswordResetOtpInput): Promise<void> {
    await assertOtpMatches(rawEmail.toLowerCase(), code);
  },

  async reset({ email: rawEmail, code, password }: ResetPasswordWithOtpInput): Promise<void> {
    const email = rawEmail.toLowerCase();
    const pending = await assertOtpMatches(email, code);
    // Hash once outside the transaction; retries must not send mail or generate
    // a new credential. Recheck expiry/attempts/generation when consuming.
    const passwordHash = await bcrypt.hash(password, 12);
    await passwordResetOtpRepository.transaction(async (session) => {
      const consumed = await passwordResetOtpRepository.consume(pending, new Date(), session);
      if (!consumed) throw new AppError(400, "Mã OTP đã được sử dụng, thay đổi hoặc hết hạn. Vui lòng yêu cầu mã mới.");
      const account = await adminAccountRepository.findByEmail(email, session);
      if (!account) throw new AppError(404, "Không tìm thấy tài khoản cần đặt lại mật khẩu.");
      const updated = await adminAccountRepository.resetPassword(String(account._id), passwordHash, session, account.email);
      if (!updated) throw new AppError(409, "Tài khoản đã thay đổi. Vui lòng yêu cầu mã mới.");
    });
  },

  async resend(rawEmail: string): Promise<{ expiresInSeconds: number }> {
    const email = rawEmail.toLowerCase();
    const pending = await getValidOtp(email);
    const now = new Date();

    if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.");

    if (pending.resendCount >= MAX_RESEND_COUNT) {
      throw new AppError(429, "Bạn đã gửi lại OTP quá nhiều lần. Vui lòng thử lại sau.");
    }
    if (pending.resendAvailableAt > now) {
      const waitSeconds = Math.ceil((pending.resendAvailableAt.getTime() - now.getTime()) / 1000);
      throw new AppError(429, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã.`);
    }

    let code = createOtpCode();
    while (isOtpMatch(pending.otpHash, hashOtp(email, code, pending.requestId))) code = createOtpCode();
    const requestId = randomUUID(), otpHash = hashOtp(email, code, requestId);
    const updated = await passwordResetOtpRepository.replaceCode(pending, {
      requestId, otpHash, otpExpiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
    }, now);
    if (!updated) throw new AppError(409, "Yêu cầu OTP đã thay đổi. Vui lòng thử lại.");
    try { await emailService.sendPasswordResetOtp(email, code); }
    catch (error) {
      await passwordResetOtpRepository.restoreAfterSendFailure({ email, requestId, otpHash }, pending);
      throw error;
    }
    return { expiresInSeconds: OTP_EXPIRY_MS / 1000 };
  },
};
