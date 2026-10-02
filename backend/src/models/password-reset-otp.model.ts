import { model, models, Schema } from "mongoose";

import type { PasswordResetOtp } from "../interfaces/password-reset-otp.interface";

const passwordResetOtpSchema = new Schema<PasswordResetOtp>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true, select: false },
    otpExpiresAt: { type: Date, required: true, index: { expires: 0 } },
    otpAttempts: { type: Number, required: true, default: 0 },
    resendAvailableAt: { type: Date, required: true },
    resendCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: "password_reset_otps" },
);

const PasswordResetOtpModel =
  models.PasswordResetOtp || model<PasswordResetOtp>("PasswordResetOtp", passwordResetOtpSchema);

export default PasswordResetOtpModel;
