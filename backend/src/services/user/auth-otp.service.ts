import bcrypt from "bcryptjs";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import type { UserAuthChallenge, UserOtpPurpose, UserRegistrationInput } from "../../interfaces/user-auth.interface";
import { userAuthChallengeRepository as repository } from "../../repositories/user/auth-challenge.repository";
import { emailService } from "../notification/email.service";
import { AppError } from "../../utils/errors/AppError";

const result = { expiresInSeconds: 180, resendAfterSeconds: 60 };
const invalid = () => new AppError(400, "Mã xác thực không hợp lệ hoặc đã hết hạn.");
function digest(email: string, purpose: UserOtpPurpose, requestId: string, code: string) {
  const secret = process.env.OTP_SECRET?.trim();
  if (!secret) throw new AppError(500, "Máy chủ chưa cấu hình xác thực.");
  return createHmac("sha256", secret).update(`user:${purpose}:${email}:${requestId}:${code}`).digest("hex");
}
function issue(email: string, purpose: UserOtpPurpose) {
  const code = String(randomInt(100000, 1000000)), requestId = randomUUID();
  return { code, requestId, otpHash: digest(email, purpose, requestId, code), expiresAt: new Date(Date.now() + 180000), resendAvailableAt: new Date(Date.now() + 60000) };
}
function matches(value: UserAuthChallenge, code: string) {
  const expected = Buffer.from(value.otpHash, "hex"), actual = Buffer.from(digest(value.email, value.purpose, value.requestId, code), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
async function send(value: UserAuthChallenge, code: string) {
  if (value.purpose === "register") await emailService.sendRegistrationOtp(value.email, code);
  else await emailService.sendPasswordResetOtp(value.email, code);
}
async function assertOtp(email: string, purpose: UserOtpPurpose, code: string) {
  const value = await repository.find(email, purpose);
  if (!value || value.expiresAt <= new Date()) throw invalid();
  if (value.attempts >= 5) throw new AppError(429, "Đã vượt số lần xác thực. Vui lòng yêu cầu mã mới sau khi mã hiện tại hết hạn.");
  if (!matches(value, code)) {
    await repository.fail(value);
    throw invalid();
  }
  return value;
}

export const userAuthOtpService = {
  async start(email: string, purpose: UserOtpPurpose, registration?: UserRegistrationInput) {
    // Return the same response for unknown, duplicate or ineligible contacts.
    const passwordHash = registration ? await bcrypt.hash(registration.password, 12) : undefined;
    const account = purpose === "reset" ? await repository.findAccount(email) : null;
    if (purpose === "reset" && !account) return { email, ...result };
    if (registration && await repository.contactExists(email, registration.phone)) return { email, ...result };
    const { code, ...otp } = issue(email, purpose);
    const value: UserAuthChallenge = { email, purpose, ...otp, attempts: 0, resendCount: 0,
      ...(registration ? { name: registration.name, phone: registration.phone, passwordHash } : {}),
      ...(account ? { accountId: String(account._id), authVersion: account.authVersion ?? 0 } : {}),
    };
    try { await repository.reserve(value); }
    catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError(429, "Yêu cầu xác thực đang chờ. Vui lòng dùng mã hiện tại hoặc chức năng gửi lại.");
      throw error;
    }
    try { await send(value, code); }
    catch (error) { await repository.remove(value); throw error; }
    return { email, ...result };
  },
  async resend(email: string, purpose: UserOtpPurpose) {
    const previous = await repository.find(email, purpose);
    if (!previous) return { email, ...result };
    if (previous.expiresAt <= new Date()) throw invalid();
    if (previous.attempts >= 5 || previous.resendCount >= 3 || previous.resendAvailableAt > new Date()) throw new AppError(429, "Chưa thể gửi lại mã. Vui lòng đợi hoặc yêu cầu mã mới sau khi mã hiện tại hết hạn.");
    let next = issue(email, purpose);
    while (matches(previous, next.code)) next = issue(email, purpose);
    const { code, ...otp } = next;
    const updated = await repository.replace(previous, otp);
    if (!updated) throw new AppError(429, "Yêu cầu đã thay đổi. Vui lòng thử lại sau.");
    try { await send(updated, code); }
    catch (error) { await repository.restore(updated, previous); throw error; }
    return { email, ...result };
  },
  async verify(email: string, purpose: UserOtpPurpose, code: string) {
    const value = await assertOtp(email, purpose, code);
    if (purpose === "reset") return;
    try {
      await repository.transaction(async session => {
        const consumed = await repository.consume(value, session);
        if (!consumed) throw invalid();
        await repository.createAccount(consumed, session);
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AppError(409, "Không thể hoàn tất đăng ký với thông tin này.");
      throw error;
    }
  },
  async reset(email: string, code: string, password: string) {
    const value = await assertOtp(email, "reset", code);
    const hash = await bcrypt.hash(password, 12);
    await repository.transaction(async session => {
      const consumed = await repository.consume(value, session);
      if (!consumed || !await repository.resetPassword(consumed, hash, session)) throw invalid();
    });
  },
};
