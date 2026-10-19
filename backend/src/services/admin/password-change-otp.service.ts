import bcrypt from "bcryptjs";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import type { ConfirmPasswordChangeInput, RequestPasswordChangeInput } from "../../interfaces/password-change-otp.interface";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { passwordChangeOtpRepository } from "../../repositories/admin/password-change-otp.repository";
import { OTP_EXPIRY_MS, OTP_RESEND_COOLDOWN_MS, MAX_OTP_ATTEMPTS, MAX_RESEND_COUNT } from "../../config/otp.config";
import { emailService } from "../notification/email.service";
import { AppError } from "../../utils/errors/AppError";

function hashCode(accountId: string, requestId: string, code: string): string {
  const secret = process.env.OTP_SECRET?.trim();
  if (!secret) throw new AppError(500, "Máy chủ chưa cấu hình bảo mật OTP.");
  return createHmac("sha256", secret).update(`password-change:${accountId}:${requestId}:${code}`).digest("hex");
}

async function getPending(accountId: string, requestId: string) {
  const pending = await passwordChangeOtpRepository.find(accountId, requestId);
  if (!pending || pending.otpExpiresAt <= new Date()) throw new AppError(400, "Phiên xác nhận đã hết hạn. Vui lòng nhập lại mật khẩu để nhận mã mới.");
  if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.");
  return pending;
}

function metadata(pending: { requestId: string; email: string; otpExpiresAt: Date; resendAvailableAt: Date }) {
  return {
    requestId: pending.requestId, email: pending.email,
    expiresInSeconds: Math.max(0, Math.ceil((pending.otpExpiresAt.getTime() - Date.now()) / 1000)),
    resendAfterSeconds: Math.max(0, Math.ceil((pending.resendAvailableAt.getTime() - Date.now()) / 1000)),
  };
}

export const passwordChangeOtpService = {
  async request(accountId: string, input: RequestPasswordChangeInput) {
    const account = await adminAccountRepository.findByIdWithPassword(accountId);
    if (!account || account.status !== "active" || account.role === "user") throw new AppError(403, "Tài khoản không được phép đổi mật khẩu.");
    if (!(await bcrypt.compare(input.currentPassword, account.password))) throw new AppError(400, "Mật khẩu hiện tại không chính xác.");
    if (input.currentPassword === input.newPassword) throw new AppError(400, "Mật khẩu mới phải khác mật khẩu hiện tại.");
    const requestId = randomUUID(), code = String(randomInt(100_000, 1_000_000)), now = new Date();
    const otpHash = hashCode(accountId, requestId, code);
    let pending;
    try {
      pending = await passwordChangeOtpRepository.reserve({
        accountId, requestId, email: account.email, otpHash,
        currentPasswordHash: account.password, newPasswordHash: await bcrypt.hash(input.newPassword, 12),
        otpExpiresAt: new Date(now.getTime() + OTP_EXPIRY_MS), otpAttempts: 0,
        resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS), resendCount: 0,
      }, now);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError(429, "Vui lòng chờ 60 giây trước khi yêu cầu mã OTP mới.");
      throw error;
    }
    if (!pending) throw new AppError(409, "Không thể tạo yêu cầu xác nhận. Vui lòng thử lại.");
    try { await emailService.sendPasswordChangeOtp(account.email, code); }
    catch (error) { await passwordChangeOtpRepository.deleteRequest(accountId, requestId); throw error; }
    return metadata(pending);
  },

  async resend(accountId: string, requestId: string) {
    const pending = await getPending(accountId, requestId), now = new Date();
    if (pending.resendCount >= MAX_RESEND_COUNT) throw new AppError(429, "Đã đạt giới hạn gửi lại OTP. Vui lòng nhập lại mật khẩu để tạo yêu cầu mới.");
    if (pending.resendAvailableAt > now) throw new AppError(429, "Vui lòng chờ trước khi gửi lại mã OTP.");
    const account = await adminAccountRepository.findByIdWithPassword(accountId);
    if (!account || account.status !== "active" || account.role === "user" || account.email !== pending.email || account.password !== pending.currentPasswordHash) throw new AppError(409, "Thông tin tài khoản đã thay đổi. Vui lòng nhập lại mật khẩu.");
    let code = String(randomInt(100_000, 1_000_000)), otpHash = hashCode(accountId, requestId, code);
    while (otpHash === pending.otpHash) {
      code = String(randomInt(100_000, 1_000_000));
      otpHash = hashCode(accountId, requestId, code);
    }
    const updated = await passwordChangeOtpRepository.replaceCode(accountId, requestId, pending.otpHash, {
      otpHash, otpExpiresAt: new Date(now.getTime() + OTP_EXPIRY_MS), resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
    }, now);
    if (!updated) throw new AppError(409, "Yêu cầu OTP đã thay đổi. Vui lòng thử lại.");
    try { await emailService.sendPasswordChangeOtp(updated.email, code); }
    catch (error) { await passwordChangeOtpRepository.restoreAfterSendFailure(accountId, requestId, otpHash, pending); throw error; }
    return metadata(updated);
  },

  async confirm(accountId: string, { requestId, code }: ConfirmPasswordChangeInput): Promise<void> {
    const pending = await getPending(accountId, requestId), otpHash = hashCode(accountId, requestId, code);
    const expected = Buffer.from(pending.otpHash, "hex"), submitted = Buffer.from(otpHash, "hex");
    if (expected.length !== submitted.length || !timingSafeEqual(expected, submitted)) {
      const failed = await passwordChangeOtpRepository.incrementAttempts(accountId, requestId, pending.otpHash, new Date());
      if (!failed || failed.otpAttempts >= MAX_OTP_ATTEMPTS) throw new AppError(429, "Mã OTP không hợp lệ hoặc đã vượt số lần nhập. Vui lòng yêu cầu mã mới.");
      throw new AppError(400, `Mã OTP không chính xác. Bạn còn ${MAX_OTP_ATTEMPTS - failed.otpAttempts} lần thử.`);
    }
    await passwordChangeOtpRepository.transaction(async (session) => {
      const consumed = await passwordChangeOtpRepository.consume(accountId, requestId, otpHash, new Date(), session);
      if (!consumed) throw new AppError(400, "Mã OTP đã được sử dụng hoặc đã thay đổi. Vui lòng yêu cầu mã mới.");
      const updated = await adminAccountRepository.changePasswordIfUnchanged(accountId, consumed.email, consumed.currentPasswordHash, consumed.newPasswordHash, session);
      if (!updated) throw new AppError(409, "Tài khoản hoặc mật khẩu đã thay đổi. Vui lòng nhập lại mật khẩu để xác nhận.");
    });
  },
};
