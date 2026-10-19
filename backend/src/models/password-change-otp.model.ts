import { model, models, Schema } from "mongoose";
import type { PasswordChangeOtp } from "../interfaces/password-change-otp.interface";

const schema = new Schema<PasswordChangeOtp>({
  accountId: { type: String, required: true, unique: true },
  requestId: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  otpHash: { type: String, required: true, select: false },
  currentPasswordHash: { type: String, required: true, select: false },
  newPasswordHash: { type: String, required: true, select: false },
  otpExpiresAt: { type: Date, required: true, index: { expires: 0 } },
  otpAttempts: { type: Number, required: true, default: 0 },
  resendAvailableAt: { type: Date, required: true },
  resendCount: { type: Number, required: true, default: 0 },
}, { timestamps: true, versionKey: false });

export default models.PasswordChangeOtp || model<PasswordChangeOtp>("PasswordChangeOtp", schema);
