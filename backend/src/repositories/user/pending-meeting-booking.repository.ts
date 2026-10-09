import type { ClientSession } from "mongoose";
import { Types } from "mongoose";

import { MAX_PENDING_PER_EMAIL } from "../../config/otp.config";
import type {
  PendingMeetingBooking,
  UpdateMeetingOtpInput,
} from "../../interfaces/meeting.interface";
import PendingMeetingBookingModel from "../../models/pending-meeting-booking.model";

interface PendingBookingDocument extends PendingMeetingBooking {
  _id: Types.ObjectId;
  pendingEmailSlot: number;
}

let pendingEmailIndexReady: Promise<void> | undefined;

async function ensurePendingEmailIndex(): Promise<void> {
  if (!pendingEmailIndexReady) {
    pendingEmailIndexReady = (async () => {
      const collection = PendingMeetingBookingModel.collection;
      await collection.deleteMany({ otpExpiresAt: { $lte: new Date() } });

      const existingPending = await collection.find({}).sort({ createdAt: 1 }).toArray();
      const nextSlots = new Map<string, number>();
      for (const pending of existingPending) {
        const email = String(pending.email).toLowerCase();
        const existingSlot = typeof pending.pendingEmailSlot === "number"
          ? pending.pendingEmailSlot
          : undefined;
        const nextSlot = nextSlots.get(email) ?? 0;

        if (existingSlot === undefined) {
          await collection.updateOne(
            { _id: pending._id, pendingEmailSlot: { $exists: false } },
            { $set: { pendingEmailSlot: nextSlot } },
          );
          nextSlots.set(email, nextSlot + 1);
        } else {
          nextSlots.set(email, Math.max(nextSlot, existingSlot + 1));
        }
      }

      await collection.createIndex(
        { email: 1, pendingEmailSlot: 1 },
        {
          unique: true,
          name: "pending_meeting_email_slot_unique",
          partialFilterExpression: { pendingEmailSlot: { $exists: true } },
        },
      );
    })().catch((error: unknown) => {
      pendingEmailIndexReady = undefined;
      throw error;
    });
  }

  await pendingEmailIndexReady;
}

export const pendingMeetingBookingRepository = {
  async create(
    data: PendingMeetingBooking,
    requestId: string,
    maxPendingPerEmail = MAX_PENDING_PER_EMAIL,
    session?: ClientSession,
  ) {
    await ensurePendingEmailIndex();
    const email = data.email.toLowerCase();
    const now = new Date();
    const collection = PendingMeetingBookingModel.collection;
    await collection.deleteMany({ email, otpExpiresAt: { $lte: now } });

    const occupiedSlots = await collection
      .find({ email })
      .project<{ pendingEmailSlot?: number }>({ pendingEmailSlot: 1 })
      .toArray();
    const used = new Set(occupiedSlots.map(({ pendingEmailSlot }) => pendingEmailSlot));

    for (let slot = 0; slot < maxPendingPerEmail; slot += 1) {
      if (used.has(slot)) continue;

      const pending = new PendingMeetingBookingModel({ ...data, email, _id: new Types.ObjectId(requestId) });
      await pending.validate();
      const document = {
        ...pending.toObject(),
        createdAt: now,
        updatedAt: now,
        pendingEmailSlot: slot,
      } as PendingBookingDocument;

      try {
        await collection.insertOne(document as never, session ? { session } : undefined);
        return this.findById(requestId, session);
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        used.add(slot);
      }
    }

    return null;
  },

  findById(id: string, session?: ClientSession) {
    return PendingMeetingBookingModel.findById(id)
      .select("-pendingEmailSlot")
      .session(session ?? null)
      .lean();
  },

  findByIdWithOtpHash(id: string, session?: ClientSession) {
    return PendingMeetingBookingModel.findById(id)
      .select("+otpHash")
      .select("-pendingEmailSlot")
      .session(session ?? null)
      .lean();
  },

  countActiveByEmail(email: string, now = new Date(), session?: ClientSession) {
    return PendingMeetingBookingModel.countDocuments({
      email: email.toLowerCase(),
      otpExpiresAt: { $gt: now },
    }).session(session ?? null);
  },

  incrementOtpAttempts(id: string, maxAttempts: number, now = new Date(), session?: ClientSession) {
    return PendingMeetingBookingModel.findOneAndUpdate(
      { _id: id, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: maxAttempts } },
      { $inc: { otpAttempts: 1 } },
      { returnDocument: "after", session },
    ).select("-pendingEmailSlot").lean();
  },

  claimResend(
    id: string,
    now: Date,
    resendAvailableAt: Date,
    maxResendCount: number,
    session?: ClientSession,
  ) {
    return PendingMeetingBookingModel.findOneAndUpdate(
      {
        _id: id,
        otpExpiresAt: { $gt: now },
        resendAvailableAt: { $lte: now },
        resendCount: { $lt: maxResendCount },
      },
      { $set: { resendAvailableAt }, $inc: { resendCount: 1 } },
      { returnDocument: "after", session },
    ).select("-pendingEmailSlot").lean();
  },

  commitResendOtp(
    id: string,
    claimedResendCount: number,
    claimedResendAvailableAt: Date,
    data: UpdateMeetingOtpInput,
    session?: ClientSession,
  ) {
    return PendingMeetingBookingModel.findOneAndUpdate(
      { _id: id, resendCount: claimedResendCount, resendAvailableAt: claimedResendAvailableAt },
      {
        $set: {
          otpHash: data.otpHash,
          otpExpiresAt: data.otpExpiresAt,
          otpAttempts: 0,
        },
      },
      { returnDocument: "after", runValidators: true, session },
    ).lean();
  },

  rollbackResend(
    id: string,
    claimedResendCount: number,
    claimedResendAvailableAt: Date,
    previousResendCount: number,
    previousResendAvailableAt: Date,
    session?: ClientSession,
  ) {
    return PendingMeetingBookingModel.updateOne(
      { _id: id, resendCount: claimedResendCount, resendAvailableAt: claimedResendAvailableAt },
      { $set: { resendCount: previousResendCount, resendAvailableAt: previousResendAvailableAt } },
      { session },
    );
  },

  updateOtp(id: string, data: UpdateMeetingOtpInput, session?: ClientSession) {
    return PendingMeetingBookingModel.findByIdAndUpdate(
      id,
      {
        $set: {
          otpHash: data.otpHash,
          otpExpiresAt: data.otpExpiresAt,
          resendAvailableAt: data.resendAvailableAt,
          resendCount: data.resendCount,
          otpAttempts: 0,
        },
      },
      { returnDocument: "after", runValidators: true, session },
    ).lean();
  },

  deleteExpired(now = new Date(), session?: ClientSession) {
    return PendingMeetingBookingModel.deleteMany({ otpExpiresAt: { $lte: now } }).session(session ?? null);
  },

  deleteById(id: string, session?: ClientSession) {
    return PendingMeetingBookingModel.findByIdAndDelete(id).session(session ?? null).lean();
  },
};
