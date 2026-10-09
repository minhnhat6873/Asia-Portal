import { model, models, Schema } from "mongoose";

import { MEETING_ROOMS } from "../config/meeting.config";
import type { MeetingBookingTrash } from "../interfaces/meeting.interface";

const meetingBookingTrashSchema = new Schema<MeetingBookingTrash>(
  {
    originalBookingId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    roomId: { type: String, required: true, enum: MEETING_ROOMS.map(({ id }) => id) },
    date: { type: String, required: true, trim: true },
    start: { type: String, required: true, trim: true },
    end: { type: String, required: true, trim: true },
    attendees: { type: Number, required: true, min: 1 },
    organizer: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    department: { type: String, required: true, trim: true },
    createdAt: { type: Date, required: true },
    movedToTrashAt: { type: Date, required: true },
    meetingEndedAt: { type: Date, required: true },
    deleteAt: { type: Date, required: true, index: { expires: 0 } },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "meeting_booking_trash",
  },
);

meetingBookingTrashSchema.index(
  { originalBookingId: 1 },
  { unique: true, name: "meeting_trash_original_booking_unique" },
);

const MeetingBookingTrashModel =
  models.MeetingBookingTrash ||
  model<MeetingBookingTrash>("MeetingBookingTrash", meetingBookingTrashSchema);

export default MeetingBookingTrashModel;
