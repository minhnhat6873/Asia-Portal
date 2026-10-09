import { model, models, Schema } from "mongoose";

import { MEETING_ROOMS } from "../config/meeting.config";
import type { MeetingBooking } from "../interfaces/meeting.interface";

const meetingBookingSchema = new Schema<MeetingBooking>(
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
    archiveClaimedAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "meeting_bookings",
  },
);

meetingBookingSchema.index({ roomId: 1, date: 1, start: 1 }, { unique: true });

const MeetingBookingModel =
  models.MeetingBooking || model<MeetingBooking>("MeetingBooking", meetingBookingSchema);

export default MeetingBookingModel;
