import mongoose, { Types } from "mongoose";

import { MEETING_TRASH_RETENTION_MS } from "../config/meeting.config";
import type { MeetingBookingTrash } from "../interfaces/meeting.interface";
import MeetingBookingTrashModel from "../models/meeting-booking-trash.model";
import { meetingBookingRepository } from "../repositories/user/meeting-booking.repository";
import { getVietnamDateTimeAsUtc, getVietnamNow } from "../utils/time/vietnamTime";

const MEETING_ARCHIVE_INTERVAL_MS = 60_000;
const MEETING_ARCHIVE_BATCH_SIZE = 200;

let interval: NodeJS.Timeout | undefined;
let isRunning = false;
let trashIndexesReady: Promise<void> | undefined;

function ensureTrashIndexes(): Promise<void> {
  if (!trashIndexesReady) {
    trashIndexesReady = MeetingBookingTrashModel.createIndexes().then(() => undefined).catch((error: unknown) => {
      trashIndexesReady = undefined;
      throw error;
    });
  }

  return trashIndexesReady;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

async function archiveEndedBookings(): Promise<void> {
  if (isRunning || mongoose.connection.readyState !== 1) return;
  isRunning = true;

  try {
    await ensureTrashIndexes();
    const now = new Date();
    const vietnamNow = getVietnamNow(now);
    const candidates = await meetingBookingRepository.findArchiveCandidates(
      vietnamNow.date,
      vietnamNow.time,
      MEETING_ARCHIVE_BATCH_SIZE,
    );

    for (const candidate of candidates) {
      const id = String(candidate._id);
      try {
        const claimed = candidate.archiveClaimedAt
          ? candidate
          : await meetingBookingRepository.claimForArchive(id, vietnamNow.date, vietnamNow.time, now);
        if (!claimed) continue;

        const meetingEndedAt = getVietnamDateTimeAsUtc(claimed.date, claimed.end);
        const deleteAt = new Date(meetingEndedAt.getTime() + MEETING_TRASH_RETENTION_MS);
        const originalBookingId = new Types.ObjectId(id);

        if (deleteAt <= new Date()) {
          await meetingBookingRepository.deleteTrashByOriginalBookingId(originalBookingId);
          await meetingBookingRepository.deleteClaimedById(id);
          continue;
        }

        if (!claimed.createdAt) {
          throw new Error("Meeting booking is missing createdAt; keep the original document for recovery.");
        }

        const trashRecord: MeetingBookingTrash = {
          originalBookingId,
          title: claimed.title,
          roomId: claimed.roomId,
          date: claimed.date,
          start: claimed.start,
          end: claimed.end,
          attendees: claimed.attendees,
          organizer: claimed.organizer,
          email: claimed.email,
          department: claimed.department,
          createdAt: claimed.createdAt,
          movedToTrashAt: new Date(),
          meetingEndedAt,
          deleteAt,
        };

        try {
          await meetingBookingRepository.upsertTrash(trashRecord);
        } catch (error) {
          if (!isDuplicateKeyError(error)) throw error;
          const existingTrashRecord = await meetingBookingRepository.findTrashByOriginalBookingId(originalBookingId);
          if (!existingTrashRecord) throw error;
        }

        await meetingBookingRepository.deleteClaimedById(id);
      } catch (error) {
        console.error(`Meeting booking archive failed for ${id}.`, error);
      }
    }
  } catch (error) {
    console.error("Meeting booking archive job failed.", error);
  } finally {
    isRunning = false;
  }
}

export function startMeetingBookingArchiveJob(): void {
  if (interval) return;

  interval = setInterval(() => {
    void archiveEndedBookings();
  }, MEETING_ARCHIVE_INTERVAL_MS);
  interval.unref();

  void archiveEndedBookings();
}
