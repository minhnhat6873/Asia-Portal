import mongoose, { type ClientSession } from "mongoose";
import type { PasswordChangeOtp } from "../../interfaces/password-change-otp.interface";
import PasswordChangeOtpModel from "../../models/password-change-otp.model";
import { MAX_OTP_ATTEMPTS, MAX_RESEND_COUNT } from "../../config/otp.config";

const PRIVATE_FIELDS = "+otpHash +currentPasswordHash +newPasswordHash";
export const passwordChangeOtpRepository = {
  async reserve(data: PasswordChangeOtp, now: Date) {
    await PasswordChangeOtpModel.init();
    return PasswordChangeOtpModel.findOneAndUpdate(
      { accountId: data.accountId, resendAvailableAt: { $lte: now } },
      { $set: data }, { upsert: true, returnDocument: "after", runValidators: true },
    ).select(PRIVATE_FIELDS).lean();
  },
  find(accountId: string, requestId: string) {
    return PasswordChangeOtpModel.findOne({ accountId, requestId }).select(PRIVATE_FIELDS).lean();
  },
  incrementAttempts(accountId: string, requestId: string, otpHash: string, now: Date) {
    return PasswordChangeOtpModel.findOneAndUpdate(
      { accountId, requestId, otpHash, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $inc: { otpAttempts: 1 } }, { returnDocument: "after" },
    ).select(PRIVATE_FIELDS).lean();
  },
  replaceCode(accountId: string, requestId: string, previousHash: string, data: Pick<PasswordChangeOtp, "otpHash" | "otpExpiresAt" | "resendAvailableAt">, now: Date) {
    return PasswordChangeOtpModel.findOneAndUpdate(
      { accountId, requestId, otpHash: previousHash, otpExpiresAt: { $gt: now }, resendAvailableAt: { $lte: now }, resendCount: { $lt: MAX_RESEND_COUNT }, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $set: data, $inc: { resendCount: 1 } }, { returnDocument: "after", runValidators: true },
    ).select(PRIVATE_FIELDS).lean();
  },
  restoreAfterSendFailure(accountId: string, requestId: string, failedHash: string, previous: PasswordChangeOtp) {
    return PasswordChangeOtpModel.updateOne({ accountId, requestId, otpHash: failedHash }, { $set: {
      otpHash: previous.otpHash, otpExpiresAt: previous.otpExpiresAt,
      resendAvailableAt: previous.resendAvailableAt, resendCount: previous.resendCount,
    } });
  },
  deleteRequest(accountId: string, requestId: string) {
    return PasswordChangeOtpModel.deleteOne({ accountId, requestId });
  },
  consume(accountId: string, requestId: string, otpHash: string, now: Date, session: ClientSession) {
    return PasswordChangeOtpModel.findOneAndDelete(
      { accountId, requestId, otpHash, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } }, { session },
    ).select(PRIVATE_FIELDS).lean();
  },
  transaction<T>(work: (session: ClientSession) => Promise<T>) {
    return mongoose.connection.transaction(work, { readPreference: "primary" });
  },
};
