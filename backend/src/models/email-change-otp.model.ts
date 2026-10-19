import { model, models, Schema } from "mongoose";
import type { EmailChangeOtp } from "../interfaces/email-change-otp.interface";

const schema = new Schema<EmailChangeOtp>({
  accountId: { type: String, required: true, unique: true },
  requestId: { type: String, required: true },
  currentEmail: { type: String, required: true, lowercase: true, trim: true },
  newEmail: { type: String, required: true, lowercase: true, trim: true },
  otpHash: { type: String, required: true, select: false },
  currentPasswordHash: { type: String, required: true, select: false },
  otpExpiresAt: { type: Date, required: true, index: { expires: 0 } },
  otpAttempts: { type: Number, required: true, default: 0 },
  resendAvailableAt: { type: Date, required: true },
  resendCount: { type: Number, required: true, default: 0 },
}, { timestamps: true, versionKey: false });

export default models.EmailChangeOtp || model<EmailChangeOtp>("EmailChangeOtp", schema);
