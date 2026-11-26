import { model, Schema } from "mongoose";
import type { UserAuthChallenge } from "../interfaces/user-auth.interface";

const schema = new Schema<UserAuthChallenge>({
  email: { type: String, required: true },
  purpose: { type: String, enum: ["register", "reset"], required: true },
  requestId: { type: String, required: true },
  otpHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  resendAvailableAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  resendCount: { type: Number, default: 0 },
  name: String,
  phone: String,
  passwordHash: { type: String, select: false },
  accountId: String,
  authVersion: Number,
}, { timestamps: true, versionKey: false });
schema.index({ email: 1, purpose: 1 }, { unique: true });
export default model<UserAuthChallenge>("UserAuthChallenge", schema);
