import { model, models, Schema } from "mongoose";

import type { MeetingCancelOtp } from "../interfaces/meeting.interface";

const meetingCancelOtpSchema = new Schema<MeetingCancelOtp>(
  {
    bookingId: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    otpHash: { type: String, required: true, select: false },
    otpExpiresAt: { type: Date, required: true, index: { expires: 0 } },
    otpAttempts: { type: Number, required: true, default: 0 },
    resendAvailableAt: { type: Date, required: true },
    resendCount: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "meeting_cancel_otps",
  },
);

const MeetingCancelOtpModel =
  models.MeetingCancelOtp || model<MeetingCancelOtp>("MeetingCancelOtp", meetingCancelOtpSchema);

export default MeetingCancelOtpModel;
