import type { ClientSession, QueryFilter, SortOrder } from "mongoose";
import { Types } from "mongoose";

import type { MeetingBooking, MeetingBookingTrash } from "../../interfaces/meeting.interface";
import MeetingBookingModel from "../../models/meeting-booking.model";
import MeetingBookingTrashModel from "../../models/meeting-booking-trash.model";
import { addMinutes, subtractMinutes } from "../../utils/time/vietnamTime";

interface FindMeetingBookingsOptions {
  filter: QueryFilter<MeetingBooking>;
  skip: number;
  limit: number;
  sort: Record<string, SortOrder>;
  session?: ClientSession;
}

interface MeetingBookingDocument extends MeetingBooking {
  _id: Types.ObjectId;
  reservationSlots: string[];
}

let reservationIndexReady: Promise<void> | undefined;

function getReservationSlots(date: string, start: string, end: string): string[] {
  const [year, month, day] = date.split("-").map(Number);
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startMinuteOfDay = startHour * 60 + startMinute;
  const endWithGap = endHour * 60 + endMinute + 15;
  const slots: string[] = [];

  for (let minute = startMinuteOfDay; minute < endWithGap; minute += 15) {
    const dayOffset = Math.floor(minute / 1440);
    const dayDate = new Date(Date.UTC(year, month - 1, day + dayOffset));
    const slotMinute = ((minute % 1440) + 1440) % 1440;
    const slotDate = [
      dayDate.getUTCFullYear(),
      String(dayDate.getUTCMonth() + 1).padStart(2, "0"),
      String(dayDate.getUTCDate()).padStart(2, "0"),
    ].join("-");
    const slotTime = `${String(Math.floor(slotMinute / 60)).padStart(2, "0")}:${String(slotMinute % 60).padStart(2, "0")}`;
    slots.push(`${slotDate}T${slotTime}`);
  }

  return slots;
}

async function ensureReservationIndex(): Promise<void> {
  if (!reservationIndexReady) {
    reservationIndexReady = (async () => {
      const collection = MeetingBookingModel.collection;
      await collection.createIndex(
        { roomId: 1, date: 1, start: 1 },
        { unique: true, name: "roomId_1_date_1_start_1" },
      );

      const existingBookings = await collection
        .find({ reservationSlots: { $exists: false } })
        .toArray();
      for (const booking of existingBookings) {
        const legacyBooking = booking as unknown as MeetingBooking;
        await collection.updateOne(
          { _id: booking._id, reservationSlots: { $exists: false } },
          {
            $set: {
              reservationSlots: getReservationSlots(
                legacyBooking.date,
                legacyBooking.start,
                legacyBooking.end,
              ),
            },
          },
        );
      }

      await collection.createIndex(
        { roomId: 1, reservationSlots: 1 },
        {
          unique: true,
          name: "meeting_room_reserved_slot_unique",
          partialFilterExpression: { reservationSlots: { $exists: true } },
        },
      );
    })().catch((error: unknown) => {
      reservationIndexReady = undefined;
      throw error;
    });
  }

  await reservationIndexReady;
}

export const meetingBookingRepository = {
  async create(data: MeetingBooking, session?: ClientSession) {
    await ensureReservationIndex();

    const booking = new MeetingBookingModel(data);
    await booking.validate();
    const document = {
      ...booking.toObject(),
      createdAt: new Date(),
      updatedAt: new Date(),
      reservationSlots: getReservationSlots(data.date, data.start, data.end),
    } as MeetingBookingDocument;

    await MeetingBookingModel.collection.insertOne(
      document as never,
      session ? { session } : undefined,
    );

    return this.findById(document._id.toString(), session);
  },

  findById(id: string, session?: ClientSession) {
    return MeetingBookingModel.findById(id)
      .select("-reservationSlots")
      .session(session ?? null)
      .lean();
  },

  findOverlapping(
    roomId: MeetingBooking["roomId"],
    date: string,
    start: string,
    end: string,
    minimumGapMinutes = 15,
    session?: ClientSession,
  ) {
    return MeetingBookingModel.findOne({
      roomId,
      date,
      start: { $lt: addMinutes(end, minimumGapMinutes) },
      end: { $gt: subtractMinutes(start, minimumGapMinutes) },
    }).select("-reservationSlots").session(session ?? null).lean();
  },

  findAll({ filter, skip, limit, sort, session }: FindMeetingBookingsOptions) {
    return MeetingBookingModel.find({ ...filter, archiveClaimedAt: { $exists: false } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(session ?? null)
      .select("-reservationSlots")
      .lean();
  },

  count(filter: QueryFilter<MeetingBooking>, session?: ClientSession) {
    return MeetingBookingModel.countDocuments({ ...filter, archiveClaimedAt: { $exists: false } })
      .session(session ?? null);
  },

  deleteById(id: string, session?: ClientSession) {
    return MeetingBookingModel.findOneAndDelete({ _id: id, archiveClaimedAt: { $exists: false } })
      .select("-reservationSlots")
      .session(session ?? null)
      .lean();
  },

  findTrashAll({ filter, skip, limit, sort, session }: FindMeetingBookingsOptions) {
    return MeetingBookingTrashModel.find({
      ...filter,
      deleteAt: { $gt: new Date() },
    } as QueryFilter<MeetingBookingTrash>)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(session ?? null)
      .lean();
  },

  countTrash(filter: QueryFilter<MeetingBooking>, now = new Date(), session?: ClientSession) {
    return MeetingBookingTrashModel.countDocuments({
      ...filter,
      deleteAt: { $gt: now },
    } as QueryFilter<MeetingBookingTrash>).session(session ?? null);
  },

  findArchiveCandidates(date: string, time: string, limit: number) {
    return MeetingBookingModel.find({
      $or: [
        { archiveClaimedAt: { $exists: true } },
        {
          archiveClaimedAt: { $exists: false },
          $or: [
            { date: { $lt: date } },
            { date, end: { $lte: time } },
          ],
        },
      ],
    })
      .sort({ date: 1, end: 1 })
      .limit(limit)
      .select("+archiveClaimedAt")
      .select("-reservationSlots")
      .lean();
  },

  claimForArchive(id: string, date: string, time: string, claimedAt: Date) {
    return MeetingBookingModel.findOneAndUpdate(
      {
        _id: id,
        archiveClaimedAt: { $exists: false },
        $or: [
          { date: { $lt: date } },
          { date, end: { $lte: time } },
        ],
      },
      { $set: { archiveClaimedAt: claimedAt } },
      { returnDocument: "after" },
    )
      .select("+archiveClaimedAt")
      .select("-reservationSlots")
      .lean();
  },

  upsertTrash(data: MeetingBookingTrash) {
    return MeetingBookingTrashModel.findOneAndUpdate(
      { originalBookingId: data.originalBookingId },
      { $setOnInsert: data },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).lean();
  },

  findTrashByOriginalBookingId(originalBookingId: MeetingBookingTrash["originalBookingId"]) {
    return MeetingBookingTrashModel.findOne({ originalBookingId }).lean();
  },

  deleteTrashByOriginalBookingId(originalBookingId: MeetingBookingTrash["originalBookingId"]) {
    return MeetingBookingTrashModel.findOneAndDelete({ originalBookingId }).lean();
  },

  deleteClaimedById(id: string) {
    return MeetingBookingModel.findOneAndDelete({
      _id: id,
      archiveClaimedAt: { $exists: true },
    })
      .select("-reservationSlots +archiveClaimedAt")
      .lean();
  },
};
