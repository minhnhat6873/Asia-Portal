import type { NextFunction, Request, Response } from "express";

import type { MeetingBookingListQuery } from "../../interfaces/meeting.interface";
import { meetingService } from "../../services/user/meeting.service";
import { userMeetingBookingService, type BookMeetingInput } from "../../services/user/meeting-booking.service";

// Every route here runs after requireUserAuth, so request.user is set.

export async function getBookings(
  request: Request<unknown, unknown, unknown, MeetingBookingListQuery>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookings = await meetingService.getBookings(request.query, request.user!.email);
    response.status(200).json({ success: true, message: "Lấy danh sách lịch họp thành công.", data: bookings });
  } catch (error) {
    next(error);
  }
}

export async function getMyBookings(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.status(200).json({ success: true, data: await userMeetingBookingService.mine(request.user!) });
  } catch (error) {
    next(error);
  }
}

export async function bookMeeting(
  request: Request<unknown, unknown, BookMeetingInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const booking = await userMeetingBookingService.book(request.user!, request.body);
    response.status(201).json({ success: true, message: "Đặt phòng họp thành công.", data: booking });
  } catch (error) {
    next(error);
  }
}

export async function cancelMyBooking(request: Request<{ id: string }>, response: Response, next: NextFunction): Promise<void> {
  try {
    const booking = await userMeetingBookingService.cancel(request.user!, request.params.id);
    response.status(200).json({ success: true, message: "Đã hủy lịch họp.", data: booking });
  } catch (error) {
    next(error);
  }
}
