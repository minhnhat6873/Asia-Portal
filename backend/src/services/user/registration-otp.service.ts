import bcrypt from "bcryptjs";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

import type {
  StartRegistrationInput,
  VerifyRegistrationOtpInput,
} from "../../interfaces/pending-registration.interface";
import { pendingRegistrationRepository } from "../../repositories/admin/pending-registration.repository";
import { userAccountRepository } from "../../repositories/user/account.repository";
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
    .update(`${email.toLowerCase()}:${code}`)
    .digest("hex");
}

function isOtpMatch(expectedHash: string, submittedHash: string): boolean {
  return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(submittedHash, "hex"));
}

export const registrationOtpService = {
  async start(data: StartRegistrationInput): Promise<{ email: string; expiresInSeconds: number }> {
    const email = data.email.toLowerCase();
    const existingAccount = await userAccountRepository.findByEmail(email);
    if (existingAccount) throw new AppError(409, "Email đã được sử dụng");

    const code = createOtpCode();
    const now = new Date();
    const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

    await pendingRegistrationRepository.upsert({
      name: data.name,
      email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 12),
      otpHash: hashOtp(email, code),
      otpExpiresAt,
      otpAttempts: 0,
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
      resendCount: 0,
    });

    try {
      await emailService.sendRegistrationOtp(email, code);
    } catch (error) {
      const pending = await pendingRegistrationRepository.findByEmail(email);
      if (pending?.otpHash === hashOtp(email, code)) {
        await pendingRegistrationRepository.deleteById(String(pending._id));
      }
      throw error;
    }

    return { email, expiresInSeconds: OTP_EXPIRY_MS / 1000 };
  },

  async verify({ email: rawEmail, code }: VerifyRegistrationOtpInput) {
    const email = rawEmail.toLowerCase();
    const pending = await pendingRegistrationRepository.findByEmail(email);
    if (!pending || pending.otpExpiresAt <= new Date()) {
      if (pending) await pendingRegistrationRepository.deleteById(String(pending._id));
      throw new AppError(400, "Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng đăng ký lại.");
    }

    if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
      throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng đăng ký lại.");
    }

    if (!isOtpMatch(pending.otpHash, hashOtp(email, code))) {
      pending.otpAttempts += 1;
      await pending.save();
      const remainingAttempts = MAX_OTP_ATTEMPTS - pending.otpAttempts;
      throw new AppError(400, `Mã OTP không chính xác. Bạn còn ${remainingAttempts} lần thử.`);
    }

    const existingAccount = await userAccountRepository.findByEmail(email);
    if (existingAccount) throw new AppError(409, "Email đã được sử dụng");

    const account = await userAccountRepository.createWithHashedPassword({
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      passwordHash: pending.passwordHash,
    });
    await pendingRegistrationRepository.deleteById(String(pending._id));

    return {
      id: String(account._id),
      name: account.name,
      email: account.email,
      phone: account.phone,
      role: account.role,
      status: account.status,
    };
  },

  async resend(rawEmail: string): Promise<{ expiresInSeconds: number }> {
    const email = rawEmail.toLowerCase();
    const pending = await pendingRegistrationRepository.findByEmail(email);
    const now = new Date();

    if (!pending || pending.otpExpiresAt <= now) {
      if (pending) await pendingRegistrationRepository.deleteById(String(pending._id));
      throw new AppError(400, "Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.");
    }
    if (pending.resendCount >= MAX_RESEND_COUNT) {
      throw new AppError(429, "Bạn đã gửi lại OTP quá nhiều lần. Vui lòng đăng ký lại sau.");
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
    await emailService.sendRegistrationOtp(email, code);

    return { expiresInSeconds: OTP_EXPIRY_MS / 1000 };
  },
};