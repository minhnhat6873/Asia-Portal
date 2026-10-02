import { createHmac, randomInt, timingSafeEqual } from "crypto";

import type {
  ResetPasswordWithOtpInput,
  StartPasswordResetInput,
  VerifyPasswordResetOtpInput,
} from "../../interfaces/password-reset-otp.interface";
import { passwordResetOtpRepository } from "../../repositories/admin/password-reset-otp.repository";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { emailService } from "../notification/email.service";
import { AppError } from "../../utils/errors/AppError";

const OTP_EXPIRY_MS = 3 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_RESEND_COUNT = 3;

function getOtpSecret(): string {
  const secret = process.env.OTP_SECRET?.trim();
  if (!secret) throw new AppError(500, "Máy chủ chưa cấu hình bảo mật OTP.");
  return secret;
}

function createOtpCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

function hashOtp(email: string, code: string): string {
  return createHmac("sha256", getOtpSecret())
    .update(`password-reset:${email.toLowerCase()}:${code}`)
    .digest("hex");
}

function isOtpMatch(expectedHash: string, submittedHash: string): boolean {
  return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(submittedHash, "hex"));
}

async function getValidOtp(email: string) {
  const pending = await passwordResetOtpRepository.findByEmail(email);
  if (!pending || pending.otpExpiresAt <= new Date()) {
    if (pending) await passwordResetOtpRepository.deleteById(String(pending._id));
    throw new AppError(400, "Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.");
  }

  return pending;
}

async function assertOtpMatches(email: string, code: string) {
  const pending = await getValidOtp(email);
  if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
    await passwordResetOtpRepository.deleteById(String(pending._id));
    throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.");
  }

  if (!isOtpMatch(pending.otpHash, hashOtp(email, code))) {
    pending.otpAttempts += 1;
    await pending.save();
    const remainingAttempts = MAX_OTP_ATTEMPTS - pending.otpAttempts;
    throw new AppError(400, `Mã OTP không chính xác. Bạn còn ${remainingAttempts} lần thử.`);
  }

  return pending;
}

export const passwordResetOtpService = {
  async start({ email: rawEmail }: StartPasswordResetInput): Promise<{ email: string; expiresInSeconds: number }> {
    const email = rawEmail.toLowerCase();
    const account = await adminAccountRepository.findByEmail(email);
    if (!account) throw new AppError(404, "Không tìm thấy tài khoản với email này.");

    const code = createOtpCode();
    const now = new Date();
    const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

    await passwordResetOtpRepository.upsert({
      email,
      otpHash: hashOtp(email, code),
      otpExpiresAt,
      otpAttempts: 0,
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
      resendCount: 0,
    });

    try {
      await emailService.sendPasswordResetOtp(email, code);
    } catch (error) {
      const pending = await passwordResetOtpRepository.findByEmail(email);
      if (pending?.otpHash === hashOtp(email, code)) {
        await passwordResetOtpRepository.deleteById(String(pending._id));
      }
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
    const account = await adminAccountRepository.findByEmail(email);
    if (!account) {
      await passwordResetOtpRepository.deleteById(String(pending._id));
      throw new AppError(404, "Không tìm thấy tài khoản cần đặt lại mật khẩu.");
    }

    await adminAccountRepository.resetPassword(String(account._id), password);
    await passwordResetOtpRepository.deleteById(String(pending._id));
  },

  async resend(rawEmail: string): Promise<{ expiresInSeconds: number }> {
    const email = rawEmail.toLowerCase();
    const pending = await getValidOtp(email);
    const now = new Date();

    if (pending.resendCount >= MAX_RESEND_COUNT) {
      throw new AppError(429, "Bạn đã gửi lại OTP quá nhiều lần. Vui lòng thử lại sau.");
    }
    if (pending.resendAvailableAt > now) {
      const waitSeconds = Math.ceil((pending.resendAvailableAt.getTime() - now.getTime()) / 1000);
      throw new AppError(429, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã.`);
    }

    const code = createOtpCode();
    pending.otpHash = hashOtp(email, code);
    pending.otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
    pending.resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);
    pending.resendCount += 1;
    pending.otpAttempts = 0;
    await pending.save();

    await emailService.sendPasswordResetOtp(email, code);
    return { expiresInSeconds: OTP_EXPIRY_MS / 1000 };
  },
};
