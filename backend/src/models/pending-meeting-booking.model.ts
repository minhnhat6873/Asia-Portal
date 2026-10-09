import { model, models, Schema } from "mongoose";

import { MEETING_ROOMS } from "../config/meeting.config";
import type { PendingMeetingBooking } from "../interfaces/meeting.interface";

const pendingMeetingBookingSchema = new Schema<PendingMeetingBooking>(
  {
    title: { type: String, required: true, trim: true },
    roomId: { type: String, required: true, enum: MEETING_ROOMS.map(({ id }) => id) },
    date: { type: String, required: true, trim: true },
    start: { type: String, required: true, trim: true },
    end: { type: String, required: true, trim: true },
    attendees: { type: Number, required: true, min: 1 },
    organizer: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    department: { type: String, required: true, trim: true },
    otpHash: { type: String, required: true, select: false },
    otpExpiresAt: { type: Date, required: true, index: { expires: 0 } },
    otpAttempts: { type: Number, required: true, default: 0 },
    resendAvailableAt: { type: Date, required: true },
    resendCount: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "pending_meeting_bookings",
  },
);

const PendingMeetingBookingModel =
  models.PendingMeetingBooking ||
  model<PendingMeetingBooking>("PendingMeetingBooking", pendingMeetingBookingSchema);

export default PendingMeetingBookingModel;
