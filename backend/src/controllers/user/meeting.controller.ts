import type { NextFunction, Request, Response } from "express";

import type {
  MeetingBookingListQuery,
  StartMeetingBookingInput,
  StartMeetingCancellationInput,
  VerifyMeetingBookingOtpInput,
  VerifyMeetingCancellationOtpInput,
} from "../../interfaces/meeting.interface";
import { meetingBookingOtpService } from "../../services/user/meeting-booking-otp.service";
import { meetingCancelOtpService } from "../../services/user/meeting-cancel-otp.service";
import { meetingService } from "../../services/user/meeting.service";

export async function getBookings(
  request: Request<unknown, unknown, unknown, MeetingBookingListQuery>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bookings = await meetingService.getBookings(request.query);
    response.status(200).json({
      success: true,
      message: "Lấy danh sách lịch họp thành công.",
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
}

export async function startBookingRequest(
  request: Request<unknown, unknown, StartMeetingBookingInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await meetingBookingOtpService.start(request.body);
    response.status(202).json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyBookingRequest(
  request: Request<unknown, unknown, VerifyMeetingBookingOtpInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await meetingBookingOtpService.verify(request.body.requestId, request.body.code);
    response.status(201).json({
      success: true,
      message: "Đặt phòng họp thành công.",
      data: result.booking,
    });
  } catch (error) {
    next(error);
  }
}

export async function resendBookingRequestOtp(
  request: Request<unknown, unknown, { requestId: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await meetingBookingOtpService.resend(request.body.requestId);
    response.status(200).json({
      success: true,
      message: "Mã OTP mới đã được gửi đến email của bạn.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function startCancellationRequest(
  request: Request<unknown, unknown, StartMeetingCancellationInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await meetingCancelOtpService.start(request.body.bookingId);
    response.status(202).json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyCancellationRequest(
  request: Request<unknown, unknown, VerifyMeetingCancellationOtpInput>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await meetingCancelOtpService.verify(request.body.bookingId, request.body.code);
    response.status(200).json({
      success: true,
      message: "Đã hủy lịch họp.",
      data: result.booking,
    });
  } catch (error) {
    next(error);
  }
}

export async function resendCancellationRequestOtp(
  request: Request<unknown, unknown, { bookingId: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await meetingCancelOtpService.resend(request.body.bookingId);
    response.status(200).json({
      success: true,
      message: "Mã OTP mới đã được gửi đến email của bạn.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
