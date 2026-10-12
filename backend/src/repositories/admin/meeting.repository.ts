import { Types } from "mongoose";
import type { PipelineStage } from "mongoose";
import type { MeetingBooking } from "../../interfaces/meeting.interface";
import MeetingBookingModel from "../../models/meeting-booking.model";
import MeetingBookingTrashModel from "../../models/meeting-booking-trash.model";
import PendingMeetingBookingModel from "../../models/pending-meeting-booking.model";
import MeetingCancelOtpModel from "../../models/meeting-cancel-otp.model";
import { ensureReservationIndex, getReservationSlots } from "../user/meeting-booking.repository";

export interface AdminBookingDocument extends MeetingBooking {
  _id: Types.ObjectId;
  managementRevision?: number;
}

const bookingProjection = {
  _id: 1, title: 1, roomId: 1, date: 1, start: 1, end: 1, attendees: 1,
  organizer: 1, email: 1, department: 1, createdAt: 1, updatedAt: 1,
  source: 1, status: 1,
};
const pendingProjection = "title organizer email department roomId date start end attendees otpExpiresAt createdAt";
const cancelProjection = "bookingId email otpExpiresAt createdAt";

// Canonical ID is always the original booking ID, including during the archive handoff.
function combinedPipeline(now: Date): PipelineStage[] {
  return [
    { $set: { source: "active" } },
    { $unionWith: { coll: MeetingBookingTrashModel.collection.name, pipeline: [
      { $match: { deleteAt: { $gt: now } } },
      { $set: { _id: "$originalBookingId", source: "history" } },
    ] } },
    { $sort: { source: -1 } },
    { $group: { _id: "$_id", booking: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$booking" } },
    { $set: { status: { $switch: {
      branches: [
        { case: { $or: [ { $eq: ["$source", "history"] }, { $lte: [
          { $dateFromString: { dateString: { $concat: ["$date", "T", "$end", ":00+07:00"] } } }, now,
        ] } ] }, then: "ended" },
        { case: { $lte: [
          { $dateFromString: { dateString: { $concat: ["$date", "T", "$start", ":00+07:00"] } } }, now,
        ] }, then: "ongoing" },
      ], default: "upcoming",
    } } } },
    { $project: bookingProjection },
  ];
}

export const adminMeetingRepository = {
  list(filter: Record<string, unknown>, page: number, limit: number, direction: 1 | -1, now: Date) {
    return MeetingBookingModel.aggregate([
      ...combinedPipeline(now), { $match: filter },
      { $facet: {
        items: [{ $sort: { date: direction, start: direction, _id: direction } }, { $skip: (page - 1) * limit }, { $limit: limit }],
        count: [{ $count: "total" }],
      } },
    ]);
  },
  summary(filter: Record<string, unknown>, today: string, now: Date) {
    return MeetingBookingModel.aggregate([
      ...combinedPipeline(now), { $match: filter },
      { $group: {
        _id: null, total: { $sum: 1 },
        today: { $sum: { $cond: [{ $eq: ["$date", today] }, 1, 0] } },
        ongoing: { $sum: { $cond: [{ $eq: ["$status", "ongoing"] }, 1, 0] } },
        ended: { $sum: { $cond: [{ $eq: ["$status", "ended"] }, 1, 0] } },
        room01: { $sum: { $cond: [{ $eq: ["$roomId", "room-01"] }, 1, 0] } },
        room02: { $sum: { $cond: [{ $eq: ["$roomId", "room-02"] }, 1, 0] } },
        departments: { $addToSet: "$department" },
      } },
      { $project: { _id: 0, total: 1, today: 1, ongoing: 1, ended: 1, room01: 1, room02: 1, departmentCount: { $size: "$departments" } } },
    ]);
  },
  findActive(id: string): Promise<AdminBookingDocument | null> {
    return MeetingBookingModel.collection.findOne({ _id: new Types.ObjectId(id) }, { projection: { reservationSlots: 0 } }) as Promise<AdminBookingDocument | null>;
  },
  findHistory(id: string) {
    return MeetingBookingTrashModel.findOne({ originalBookingId: new Types.ObjectId(id), deleteAt: { $gt: new Date() } }).lean();
  },
  async update(snapshot: AdminBookingDocument, data: MeetingBooking, upcoming: boolean) {
    await ensureReservationIndex();
    const filter = {
      _id: snapshot._id, archiveClaimedAt: { $exists: false },
      managementRevision: snapshot.managementRevision ?? { $exists: false },
      // Recheck lifecycle against MongoDB's clock at the atomic write, not the earlier read.
      $expr: { $and: [
        { $gt: [{ $dateFromString: { dateString: `${snapshot.date}T${upcoming ? snapshot.start : snapshot.end}:00+07:00` } }, "$$NOW"] },
        { $gt: [{ $dateFromString: { dateString: `${data.date}T${upcoming ? data.start : data.end}:00+07:00` } }, "$$NOW"] },
      ] },
    };
    return MeetingBookingModel.collection.findOneAndUpdate(filter, {
      $set: { ...data, reservationSlots: getReservationSlots(data.date, data.start, data.end), updatedAt: new Date() },
      $inc: { managementRevision: 1 },
    }, { returnDocument: "after", projection: { reservationSlots: 0 } }) as Promise<AdminBookingDocument | null>;
  },
  deleteActive(id: string) {
    return MeetingBookingModel.findOneAndDelete({ _id: id, archiveClaimedAt: { $exists: false } }).select("-reservationSlots").lean();
  },
  deleteHistory(id: string) {
    return MeetingBookingTrashModel.findOneAndDelete({ originalBookingId: new Types.ObjectId(id) }).lean();
  },
  async requests(kind: "pending" | "cancel", skip: number, limit: number) {
    const model = kind === "pending" ? PendingMeetingBookingModel : MeetingCancelOtpModel;
    return Promise.all([
      model.find({}).select(kind === "pending" ? pendingProjection : cancelProjection).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      model.countDocuments({}),
    ]);
  },
  countPending(now: Date) {
    return PendingMeetingBookingModel.countDocuments({ otpExpiresAt: { $gt: now } });
  },
  revokePending(id: string) {
    return PendingMeetingBookingModel.findByIdAndDelete(id).select(pendingProjection).lean();
  },
  revokeCancel(bookingId: string) {
    return MeetingCancelOtpModel.findOneAndDelete({ bookingId }).select(cancelProjection).lean();
  },
};
