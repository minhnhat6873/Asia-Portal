import { model, models, Schema } from "mongoose";
import type { AuthSession } from "../interfaces/auth-session.interface";

const schema = new Schema<AuthSession>({
  sessionId: { type: String, required: true, unique: true },
  accountId: { type: String, required: true, index: true },
  authVersion: { type: Number, required: true },
  persistent: { type: Boolean, required: true },
  refreshHash: { type: String, select: false },
  previousRefreshHash: { type: String, select: false },
  refreshNonce: { type: String, select: false },
  refreshedAt: { type: Number },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  ipAddress: { type: String, maxlength: 64 },
  lastIpAddress: { type: String, maxlength: 64 },
  browser: { type: String, maxlength: 60 },
  operatingSystem: { type: String, maxlength: 60 },
  lastSeenAt: { type: Date },
}, { timestamps: true, versionKey: false });

schema.index({ accountId: 1, authVersion: 1, lastSeenAt: -1 });

export default models.AuthSession || model<AuthSession>("AuthSession", schema);
