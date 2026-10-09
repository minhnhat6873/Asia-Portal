import type { Types } from "mongoose";

import type { MeetingRoomId } from "../config/meeting.config";

export interface MeetingBooking {
  title: string;
  roomId: MeetingRoomId;
  date: string;
  start: string;
  end: string;
  attendees: number;
  organizer: string;
  email: string;
  department: string;
  createdAt?: Date;
  updatedAt?: Date;
  archiveClaimedAt?: Date;
}

export interface MeetingBookingTrash extends Omit<MeetingBooking, "updatedAt" | "archiveClaimedAt"> {
  originalBookingId: Types.ObjectId;
  createdAt: Date;
  movedToTrashAt: Date;
  meetingEndedAt: Date;
  deleteAt: Date;
}

export type CreateMeetingBookingInput = Omit<MeetingBooking, "createdAt" | "updatedAt">;

export interface PendingMeetingBooking extends MeetingBooking {
  otpHash: string;
  otpExpiresAt: Date;
  otpAttempts: number;
  resendAvailableAt: Date;
  resendCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreatePendingMeetingBookingInput = Omit<
  PendingMeetingBooking,
  "createdAt" | "updatedAt"
>;

export interface MeetingCancelOtp {
  bookingId: string;
  email: string;
  otpHash: string;
  otpExpiresAt: Date;
  otpAttempts: number;
  resendAvailableAt: Date;
  resendCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateMeetingCancelOtpInput = Omit<MeetingCancelOtp, "createdAt" | "updatedAt">;

export type StartMeetingBookingInput = Omit<CreateMeetingBookingInput, "end"> & {
  durationMinutes: number;
};

export interface VerifyMeetingBookingOtpInput {
  requestId: string;
  code: string;
}

export interface StartMeetingCancellationInput {
  bookingId: string;
}

export interface VerifyMeetingCancellationOtpInput extends StartMeetingCancellationInput {
  code: string;
}

export interface ResendMeetingOtpInput {
  requestId?: string;
  bookingId?: string;
}

export interface MeetingBookingListQuery {
  dateFrom?: string;
  dateTo?: string;
  roomId?: MeetingRoomId;
  department?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export interface UpdateMeetingOtpInput {
  otpHash: string;
  otpExpiresAt: Date;
  resendAvailableAt: Date;
  resendCount: number;
}
