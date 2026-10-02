import { model, models, Schema } from "mongoose";

import type { PendingRegistration } from "../interfaces/pending-registration.interface";

const pendingRegistrationSchema = new Schema<PendingRegistration>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    otpHash: { type: String, required: true, select: false },
    otpExpiresAt: { type: Date, required: true, index: { expires: 0 } },
    otpAttempts: { type: Number, required: true, default: 0 },
    resendAvailableAt: { type: Date, required: true },
    resendCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: "pending_registrations" },
);

const PendingRegistrationModel =
  models.PendingRegistration || model<PendingRegistration>("PendingRegistration", pendingRegistrationSchema);

export default PendingRegistrationModel;