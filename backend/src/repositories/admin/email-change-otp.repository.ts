import mongoose, { type ClientSession } from "mongoose";
import type { EmailChangeOtp } from "../../interfaces/email-change-otp.interface";
import EmailChangeOtpModel from "../../models/email-change-otp.model";
import { MAX_OTP_ATTEMPTS, MAX_RESEND_COUNT } from "../../config/otp.config";

const PRIVATE_FIELDS = "+otpHash +currentPasswordHash";
export const emailChangeOtpRepository = {
  async reserve(data: EmailChangeOtp, now: Date) {
    await EmailChangeOtpModel.init();
    return EmailChangeOtpModel.findOneAndUpdate(
      { accountId: data.accountId, resendAvailableAt: { $lte: now } },
      { $set: data }, { upsert: true, returnDocument: "after", runValidators: true },
    ).select(PRIVATE_FIELDS).lean();
  },
  find(accountId: string, requestId: string) {
    return EmailChangeOtpModel.findOne({ accountId, requestId }).select(PRIVATE_FIELDS).lean();
  },
  incrementAttempts(accountId: string, requestId: string, otpHash: string, now: Date) {
    return EmailChangeOtpModel.findOneAndUpdate(
      { accountId, requestId, otpHash, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $inc: { otpAttempts: 1 } }, { returnDocument: "after" },
    ).select(PRIVATE_FIELDS).lean();
  },
  replaceCode(accountId: string, requestId: string, previousHash: string, data: Pick<EmailChangeOtp, "otpHash" | "otpExpiresAt" | "resendAvailableAt">, now: Date) {
    return EmailChangeOtpModel.findOneAndUpdate(
      { accountId, requestId, otpHash: previousHash, otpExpiresAt: { $gt: now }, resendAvailableAt: { $lte: now }, resendCount: { $lt: MAX_RESEND_COUNT }, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $set: data, $inc: { resendCount: 1 } }, { returnDocument: "after", runValidators: true },
    ).select(PRIVATE_FIELDS).lean();
  },
  restoreAfterSendFailure(accountId: string, requestId: string, failedHash: string, previous: EmailChangeOtp) {
    return EmailChangeOtpModel.updateOne({ accountId, requestId, otpHash: failedHash }, { $set: {
      otpHash: previous.otpHash, otpExpiresAt: previous.otpExpiresAt,
      resendAvailableAt: previous.resendAvailableAt, resendCount: previous.resendCount,
    } });
  },
  deleteRequest(accountId: string, requestId: string) {
    return EmailChangeOtpModel.deleteOne({ accountId, requestId });
  },
  consume(accountId: string, requestId: string, otpHash: string, now: Date, session: ClientSession) {
    return EmailChangeOtpModel.findOneAndDelete(
      { accountId, requestId, otpHash, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: MAX_OTP_ATTEMPTS } }, { session },
    ).select(PRIVATE_FIELDS).lean();
  },
  transaction<T>(work: (session: ClientSession) => Promise<T>) {
    return mongoose.connection.transaction(work, { readPreference: "primary" });
  },
};
