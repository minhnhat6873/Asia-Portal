import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import type { ClientSession } from "mongoose";
import type { ConfirmEmailChangeInput, EmailChangeOtp, RequestEmailChangeInput } from "../../interfaces/email-change-otp.interface";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { emailChangeOtpRepository as repository } from "../../repositories/admin/email-change-otp.repository";
import { OTP_EXPIRY_MS, OTP_RESEND_COOLDOWN_MS, MAX_OTP_ATTEMPTS, MAX_RESEND_COUNT } from "../../config/otp.config";
import { emailService } from "../notification/email.service";
import { AppError } from "../../utils/errors/AppError";

function hashCode(accountId: string, requestId: string, email: string, code: string): string {
  const secret = process.env.OTP_SECRET?.trim();
  if (!secret) throw new AppError(500, "Máy chủ chưa cấu hình bảo mật OTP.");
  return createHmac("sha256", secret).update(`email-change:${accountId}:${requestId}:${email}:${code}`).digest("hex");
}

async function ensureAvailable(email: string, session?: ClientSession) {
  if (await adminAccountRepository.findByEmail(email, session)) throw new AppError(409, "Email đã được tài khoản khác sử dụng.");
}

async function getPending(accountId: string, requestId: string): Promise<EmailChangeOtp> {
  const pending = await repository.find(accountId, requestId);
  if (!pending || pending.otpExpiresAt <= new Date()) throw new AppError(400, "Phiên xác nhận đã hết hạn. Vui lòng nhập lại email để nhận mã mới.");
  if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.");
  return pending;
}

function metadata(pending: EmailChangeOtp) {
  return {
    requestId: pending.requestId, email: pending.newEmail,
    expiresInSeconds: Math.max(0, Math.ceil((pending.otpExpiresAt.getTime() - Date.now()) / 1000)),
    resendAfterSeconds: Math.max(0, Math.ceil((pending.resendAvailableAt.getTime() - Date.now()) / 1000)),
  };
}

export const emailChangeOtpService = {
  async request(accountId: string, { newEmail }: RequestEmailChangeInput) {
    newEmail = newEmail.trim().toLowerCase();
    const account = await adminAccountRepository.findByIdWithPassword(accountId);
    if (!account || account.status !== "active" || !["admin", "manager"].includes(account.role)) throw new AppError(403, "Tài khoản không được phép đổi email.");
    if (account.email.trim().toLowerCase() === newEmail) throw new AppError(400, "Email mới phải khác email hiện tại.");
    await ensureAvailable(newEmail);
    const requestId = randomUUID(), code = String(randomInt(100_000, 1_000_000)), now = new Date();
    const otpHash = hashCode(accountId, requestId, newEmail, code);
    let pending;
    try {
      pending = await repository.reserve({
        accountId, requestId, currentEmail: account.email, newEmail, currentPasswordHash: account.password, otpHash,
        otpExpiresAt: new Date(now.getTime() + OTP_EXPIRY_MS), otpAttempts: 0,
        resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS), resendCount: 0,
      }, now);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError(429, "Vui lòng chờ 60 giây trước khi yêu cầu mã OTP mới.");
      throw error;
    }
    if (!pending) throw new AppError(409, "Không thể tạo yêu cầu xác nhận. Vui lòng thử lại.");
    try { await emailService.sendEmailChangeOtp(newEmail, code); }
    catch (error) { await repository.deleteRequest(accountId, requestId); throw error; }
    return metadata(pending);
  },

  async resend(accountId: string, requestId: string) {
    const pending = await getPending(accountId, requestId), now = new Date();
    if (pending.resendCount >= MAX_RESEND_COUNT) throw new AppError(429, "Đã đạt giới hạn gửi lại OTP. Vui lòng nhập lại email để tạo yêu cầu mới.");
    if (pending.resendAvailableAt > now) throw new AppError(429, "Vui lòng chờ trước khi gửi lại mã OTP.");
    const account = await adminAccountRepository.findByIdWithPassword(accountId);
    if (!account || account.status !== "active" || !["admin", "manager"].includes(account.role) || account.email !== pending.currentEmail || account.password !== pending.currentPasswordHash) throw new AppError(409, "Thông tin tài khoản đã thay đổi. Vui lòng tạo lại yêu cầu đổi email.");
    await ensureAvailable(pending.newEmail);
    let code = String(randomInt(100_000, 1_000_000)), otpHash = hashCode(accountId, requestId, pending.newEmail, code);
    while (otpHash === pending.otpHash) {
      code = String(randomInt(100_000, 1_000_000));
      otpHash = hashCode(accountId, requestId, pending.newEmail, code);
    }
    const updated = await repository.replaceCode(accountId, requestId, pending.otpHash, {
      otpHash, otpExpiresAt: new Date(now.getTime() + OTP_EXPIRY_MS), resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
    }, now);
    if (!updated) throw new AppError(409, "Yêu cầu OTP đã thay đổi. Vui lòng thử lại.");
    try { await emailService.sendEmailChangeOtp(updated.newEmail, code); }
    catch (error) { await repository.restoreAfterSendFailure(accountId, requestId, otpHash, pending); throw error; }
    return metadata(updated);
  },

  async confirm(accountId: string, { requestId, code }: ConfirmEmailChangeInput): Promise<{ email: string }> {
    const pending = await getPending(accountId, requestId), otpHash = hashCode(accountId, requestId, pending.newEmail, code);
    const expected = Buffer.from(pending.otpHash, "hex"), submitted = Buffer.from(otpHash, "hex");
    if (expected.length !== submitted.length || !timingSafeEqual(expected, submitted)) {
      const failed = await repository.incrementAttempts(accountId, requestId, pending.otpHash, new Date());
      if (!failed || failed.otpAttempts >= MAX_OTP_ATTEMPTS) throw new AppError(429, "Mã OTP không hợp lệ hoặc đã vượt số lần nhập. Vui lòng yêu cầu mã mới.");
      throw new AppError(400, `Mã OTP không chính xác. Bạn còn ${MAX_OTP_ATTEMPTS - failed.otpAttempts} lần thử.`);
    }
    try {
      return await repository.transaction(async (session) => {
        const consumed = await repository.consume(accountId, requestId, otpHash, new Date(), session);
        if (!consumed) throw new AppError(400, "Mã OTP đã được sử dụng hoặc đã thay đổi. Vui lòng yêu cầu mã mới.");
        await ensureAvailable(consumed.newEmail, session);
        const updated = await adminAccountRepository.changeEmailIfUnchanged(accountId, consumed.currentEmail, consumed.newEmail, consumed.currentPasswordHash, session);
        if (!updated) throw new AppError(409, "Tài khoản hoặc mật khẩu đã thay đổi. Vui lòng tạo lại yêu cầu đổi email.");
        return { email: consumed.newEmail };
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError(409, "Email đã được tài khoản khác sử dụng.");
      throw error;
    }
  },
};
