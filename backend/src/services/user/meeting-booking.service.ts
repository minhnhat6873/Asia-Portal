import mongoose from "mongoose";

import type { AuthenticatedAccount } from "../../interfaces/account.interface";
import type { MeetingBooking, StartMeetingBookingInput } from "../../interfaces/meeting.interface";
import { remindMeetingBookingIfDue } from "../../jobs/meeting-booking-reminder.job";
import { meetingBookingRepository } from "../../repositories/user/meeting-booking.repository";
import { AppError } from "../../utils/errors/AppError";
import { validateBookingInput } from "../../utils/meeting/validateBooking";
import { compareTimes, getVietnamNow } from "../../utils/time/vietnamTime";
import { notificationService } from "./notification.service";

export const BOOKING_CONFLICT_MESSAGE =
  "Khung giờ này vừa được người khác đặt. Vui lòng chọn giờ khác hoặc đổi phòng họp.";
// Ended meetings stay in the meeting trash for 15 days (MEETING_TRASH_RETENTION_MS), so show the same window.
const MY_BOOKINGS_PAST_DAYS = 15;

export type BookMeetingInput = Omit<StartMeetingBookingInput, "organizer" | "email">;
type StoredBooking = MeetingBooking & { _id: unknown };

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

/** The owner sees their own email in full; everyone else gets a masked one elsewhere. */
function toOwnBooking(booking: StoredBooking, id = String(booking._id)) {
  return {
    id, title: booking.title, roomId: booking.roomId, date: booking.date, start: booking.start, end: booking.end,
    attendees: booking.attendees, organizer: booking.organizer, email: booking.email, department: booking.department,
  };
}

function hasEnded(booking: Pick<MeetingBooking, "date" | "end">): boolean {
  const now = getVietnamNow();
  return booking.date < now.date || (booking.date === now.date && compareTimes(booking.end, now.time) <= 0);
}

function daysAgo(days: number): string {
  const today = new Date(`${getVietnamNow().date}T00:00:00.000Z`);
  today.setUTCDate(today.getUTCDate() - days);
  return today.toISOString().slice(0, 10);
}

/** Booking as a signed-in account: name and email always come from the account. */
export const userMeetingBookingService = {
  async book(account: AuthenticatedAccount, input: BookMeetingInput) {
    const booking = { ...input, organizer: account.name, email: account.email };
    const { end, room } = validateBookingInput(booking, true, true);
    if (await meetingBookingRepository.findOverlapping(room.id, input.date, input.start, end)) {
      throw new AppError(409, BOOKING_CONFLICT_MESSAGE);
    }

    let created;
    try {
      created = await meetingBookingRepository.create({
        title: input.title.trim(), roomId: room.id, date: input.date, start: input.start, end,
        attendees: input.attendees, organizer: account.name.trim(), email: account.email.trim().toLowerCase(),
        department: input.department.trim(),
      });
    } catch (error) {
      // The reservation-slot unique index settles two requests that passed the pre-check together.
      if (isDuplicateKeyError(error)) throw new AppError(409, BOOKING_CONFLICT_MESSAGE);
      throw error;
    }
    if (!created) throw new AppError(500, "Không thể hoàn tất đặt phòng họp.");

    const stored = created as StoredBooking;
    await notificationService.bookingConfirmed(account.id, stored);
    await remindMeetingBookingIfDue(String(stored._id));
    return toOwnBooking(stored);
  },

  /** Only the person who booked can cancel, and only before the meeting ends. */
  async cancel(account: AuthenticatedAccount, bookingId: string) {
    if (!mongoose.isValidObjectId(bookingId)) throw new AppError(404, "Không tìm thấy lịch họp của bạn.");
    const booking = await meetingBookingRepository.findById(bookingId) as StoredBooking | null;
    if (!booking || booking.email?.trim().toLowerCase() !== account.email.trim().toLowerCase()) {
      throw new AppError(404, "Không tìm thấy lịch họp của bạn.");
    }
    if (hasEnded(booking)) throw new AppError(409, "Cuộc họp đã kết thúc và không thể hủy.");

    const deleted = await meetingBookingRepository.deleteById(bookingId, undefined, booking);
    if (!deleted) throw new AppError(409, "Lịch họp đã thay đổi hoặc bị xóa. Vui lòng tải lại.");
    await notificationService.withdrawBooking(bookingId);
    return toOwnBooking(deleted as StoredBooking);
  },

  /** Upcoming meetings plus the last 15 days, newest-first for the past ones. */
  async mine(account: AuthenticatedAccount) {
    const filter = { email: account.email.trim().toLowerCase(), date: { $gte: daysAgo(MY_BOOKINGS_PAST_DAYS) } };
    const sort = { date: 1 as const, start: 1 as const };
    const [active, ended] = await Promise.all([
      meetingBookingRepository.findAll({ filter, skip: 0, limit: 300, sort }),
      meetingBookingRepository.findTrashAll({ filter, skip: 0, limit: 300, sort }),
    ]);
    const items = [
      ...active.map((booking) => ({ ...toOwnBooking(booking as StoredBooking), ended: hasEnded(booking) })),
      ...ended.map((booking) => ({ ...toOwnBooking(booking as unknown as StoredBooking, String(booking.originalBookingId)), ended: true })),
    ];
    const upcoming = items.filter((item) => !item.ended)
      .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
    const past = items.filter((item) => item.ended)
      .sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`));
    return { upcoming, past };
  },
};
