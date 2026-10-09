import type { QueryFilter } from "mongoose";

import type { MeetingBooking, MeetingBookingListQuery } from "../../interfaces/meeting.interface";
import { meetingBookingRepository } from "../../repositories/user/meeting-booking.repository";
import { escapeRegex } from "../../utils/regex/escapeRegex";
import { maskEmail } from "../../utils/email/maskEmail";

export const meetingService = {
  async getBookings(query: MeetingBookingListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
    const filter: QueryFilter<MeetingBooking> = {};

    if (query.dateFrom || query.dateTo) {
      filter.date = {
        ...(query.dateFrom ? { $gte: query.dateFrom } : {}),
        ...(query.dateTo ? { $lte: query.dateTo } : {}),
      };
    }
    if (query.roomId) filter.roomId = query.roomId;
    if (query.department) filter.department = query.department.trim();

    const search = query.search?.trim();
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { title: expression },
        { organizer: expression },
        { department: expression },
      ];
    }

    const fetchLimit = (page - 1) * limit + limit;
    const now = new Date();
    const [bookings, trashedBookings, activeTotal, trashTotal] = await Promise.all([
      meetingBookingRepository.findAll({
        filter,
        skip: 0,
        limit: fetchLimit,
        sort: { date: 1, start: 1 },
      }),
      meetingBookingRepository.findTrashAll({
        filter,
        skip: 0,
        limit: fetchLimit,
        sort: { date: 1, start: 1 },
      }),
      meetingBookingRepository.count(filter),
      meetingBookingRepository.countTrash(filter, now),
    ]);

    const items = [
      ...bookings.map((booking) => ({
        id: String(booking._id),
        title: booking.title,
        roomId: booking.roomId,
        date: booking.date,
        start: booking.start,
        end: booking.end,
        attendees: booking.attendees,
        organizer: booking.organizer,
        email: maskEmail(booking.email),
        department: booking.department,
      })),
      ...trashedBookings.map((booking) => ({
        id: String(booking.originalBookingId),
        title: booking.title,
        roomId: booking.roomId,
        date: booking.date,
        start: booking.start,
        end: booking.end,
        attendees: booking.attendees,
        organizer: booking.organizer,
        email: maskEmail(booking.email),
        department: booking.department,
      })),
    ]
      .sort((first, second) => `${first.date} ${first.start}`.localeCompare(`${second.date} ${second.start}`))
      .slice((page - 1) * limit, page * limit);

    const total = activeTotal + trashTotal;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
