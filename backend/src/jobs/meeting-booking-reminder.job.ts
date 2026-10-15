import mongoose from "mongoose";

import { MEETING_ROOMS } from "../config/meeting.config";
import MeetingBookingModel from "../models/meeting-booking.model";
import { emailService } from "../services/notification/email.service";
import { getVietnamDateTimeAsUtc, getVietnamNow } from "../utils/time/vietnamTime";

const REMINDER_LEAD_TIME_MS = 30 * 60_000;
const REMINDER_POLL_INTERVAL_MS = 30_000;
const REMINDER_LOCK_MS = 5 * 60_000;
const REMINDER_BATCH_SIZE = 200;

let interval: NodeJS.Timeout | undefined;
let isRunning = false;

function addCalendarDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function releaseReminderLock(id: unknown, lockUntil: Date): Promise<void> {
  await MeetingBookingModel.updateOne(
    { _id: id, reminderLockUntil: lockUntil, reminderSentAt: { $exists: false } },
    { $unset: { reminderLockUntil: "" } },
    { timestamps: false },
  );
}

async function sendReminderForBooking(id: unknown, now = new Date()): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  const candidate = await MeetingBookingModel.findOne({
    _id: id,
    reminderSentAt: { $exists: false },
    isDemoData: { $ne: true },
    archiveClaimedAt: { $exists: false },
    $or: [
      { reminderLockUntil: { $exists: false } },
      { reminderLockUntil: { $lte: now } },
    ],
  })
    .select("_id title roomId date start end attendees organizer email department updatedAt")
    .lean();
  if (!candidate) return;

  const startsAt = getVietnamDateTimeAsUtc(candidate.date, candidate.start);
  const timeUntilStart = startsAt.getTime() - now.getTime();
  if (timeUntilStart <= 0 || timeUntilStart > REMINDER_LEAD_TIME_MS) return;

  const lockUntil = new Date(now.getTime() + REMINDER_LOCK_MS);
  const claimed = await MeetingBookingModel.findOneAndUpdate(
    {
      _id: candidate._id,
      ...(candidate.updatedAt ? { updatedAt: candidate.updatedAt } : { updatedAt: { $exists: false } }),
      reminderSentAt: { $exists: false },
      isDemoData: { $ne: true },
      archiveClaimedAt: { $exists: false },
      $or: [
        { reminderLockUntil: { $exists: false } },
        { reminderLockUntil: { $lte: now } },
      ],
    },
    { $set: { reminderLockUntil: lockUntil } },
    { new: true, timestamps: false },
  ).lean();
  if (!claimed) return;

  try {
    const latest = await MeetingBookingModel.findOne({
      _id: claimed._id,
      reminderLockUntil: lockUntil,
      reminderSentAt: { $exists: false },
      isDemoData: { $ne: true },
      archiveClaimedAt: { $exists: false },
    })
      .select("title roomId date start end attendees organizer email department updatedAt")
      .lean();

    if (!latest) {
      await releaseReminderLock(claimed._id, lockUntil);
      return;
    }
    const latestStart = getVietnamDateTimeAsUtc(latest.date, latest.start);
    const latestTimeUntilStart = latestStart.getTime() - new Date().getTime();
    if (latestTimeUntilStart <= 0 || latestTimeUntilStart > REMINDER_LEAD_TIME_MS) {
      await releaseReminderLock(latest._id, lockUntil);
      return;
    }

    const room = MEETING_ROOMS.find(({ id: roomId }) => roomId === latest.roomId);
    if (!room) throw new Error("Meeting room configuration was not found.");

    await emailService.sendMeetingReminder(latest.email, {
      title: latest.title,
      roomName: room.name,
      floor: room.floor,
      date: latest.date,
      start: latest.start,
      end: latest.end,
      organizer: latest.organizer,
      department: latest.department,
      attendees: latest.attendees,
    });

    await MeetingBookingModel.updateOne(
      { _id: latest._id, reminderLockUntil: lockUntil, reminderSentAt: { $exists: false } },
      { $set: { reminderSentAt: new Date() }, $unset: { reminderLockUntil: "" } },
      { timestamps: false },
    );
  } catch (error) {
    // Retain the short lease after a delivery failure so the next poll does not retry immediately.
    console.error(`Meeting reminder delivery failed for booking ${String(candidate._id)}.`, error);
  }
}

/** Immediately sends a reminder for a newly created booking if it starts within 30 minutes. */
export async function remindMeetingBookingIfDue(bookingId: string): Promise<void> {
  try {
    await sendReminderForBooking(bookingId);
  } catch (error) {
    // The booking is already saved; a mail failure must not make the API report a failed booking.
    console.error(`Could not trigger immediate meeting reminder for booking ${bookingId}.`, error);
  }
}

async function sendDueMeetingReminders(): Promise<void> {
  if (isRunning || mongoose.connection.readyState !== 1) return;
  isRunning = true;

  try {
    const now = new Date();
    const vietnamNow = getVietnamNow(now);
    const candidates = await MeetingBookingModel.find({
      date: { $gte: vietnamNow.date, $lte: addCalendarDays(vietnamNow.date, 1) },
      reminderSentAt: { $exists: false },
      isDemoData: { $ne: true },
      archiveClaimedAt: { $exists: false },
      $or: [
        { reminderLockUntil: { $exists: false } },
        { reminderLockUntil: { $lte: now } },
      ],
    })
      .select("_id title roomId date start end attendees organizer email department updatedAt")
      .sort({ date: 1, start: 1 })
      .limit(REMINDER_BATCH_SIZE)
      .lean();

    for (const candidate of candidates) await sendReminderForBooking(candidate._id, now);
  } catch (error) {
    console.error("Meeting booking reminder job failed.", error);
  } finally {
    isRunning = false;
  }
}

export function startMeetingBookingReminderJob(): void {
  if (interval) return;

  interval = setInterval(() => {
    void sendDueMeetingReminders();
  }, REMINDER_POLL_INTERVAL_MS);
  interval.unref();

  void sendDueMeetingReminders();
}
