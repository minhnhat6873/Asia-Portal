import mongoose, { type ClientSession } from "mongoose";
import type { PasswordResetOtp, PasswordResetOtpSnapshot } from "../../interfaces/password-reset-otp.interface";
import PasswordResetOtpModel from "../../models/password-reset-otp.model";
import { MAX_OTP_ATTEMPTS, MAX_RESEND_COUNT } from "../../config/otp.config";

function generation(snapshot: PasswordResetOtpSnapshot) {
  return { email: snapshot.email, otpHash: snapshot.otpHash, requestId: snapshot.requestId ?? { $exists: false } };
}

export const passwordResetOtpRepository = {
  findByEmail(email: string) {
    return PasswordResetOtpModel.findOne({ email: email.toLowerCase() }).select("+otpHash").lean();
  },

  async reserve(data: Omit<PasswordResetOtp, "createdAt" | "updatedAt">, now: Date) {
    await PasswordResetOtpModel.init();
    return PasswordResetOtpModel.findOneAndUpdate(
      { email: data.email.toLowerCase(), resendAvailableAt: { $lte: now } },
      { $set: data },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    ).select("+otpHash").lean();
  },

  deleteRequest(snapshot: PasswordResetOtpSnapshot) {
    return PasswordResetOtpModel.deleteOne(generation(snapshot));
  },
  incrementAttempts(snapshot: PasswordResetOtpSnapshot, now: Date) {
    return PasswordResetOtpModel.findOneAndUpdate(
      { ...generation(snapshot), otpExpiresAt: { $gt: now }, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $inc: { otpAttempts: 1 } }, { returnDocument: "after" },
    ).select("+otpHash").lean();
  },
  consume(snapshot: PasswordResetOtpSnapshot, now: Date, session: ClientSession) {
    return PasswordResetOtpModel.findOneAndDelete(
      { ...generation(snapshot), otpExpiresAt: { $gt: now }, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } }, { session },
    ).select("+otpHash").lean();
  },
  replaceCode(snapshot: PasswordResetOtpSnapshot, data: Pick<PasswordResetOtp, "requestId" | "otpHash" | "otpExpiresAt" | "resendAvailableAt">, now: Date) {
    return PasswordResetOtpModel.findOneAndUpdate(
      { ...generation(snapshot), otpExpiresAt: { $gt: now }, resendAvailableAt: { $lte: now }, resendCount: { $lt: MAX_RESEND_COUNT }, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $set: data, $inc: { resendCount: 1 } }, { returnDocument: "after", runValidators: true },
    ).select("+otpHash").lean();
  },
  restoreAfterSendFailure(failed: PasswordResetOtpSnapshot, previous: PasswordResetOtp) {
    return PasswordResetOtpModel.updateOne(generation(failed), {
      $set: { otpHash: previous.otpHash, otpExpiresAt: previous.otpExpiresAt, resendAvailableAt: previous.resendAvailableAt,
        ...(previous.requestId ? { requestId: previous.requestId } : {}) },
      ...(!previous.requestId ? { $unset: { requestId: "" } } : {}),
      $inc: { resendCount: -1 },
    });
  },
  transaction<T>(work: (session: ClientSession) => Promise<T>) {
    return mongoose.connection.transaction(work, { readPreference: "primary" });
  },
};
