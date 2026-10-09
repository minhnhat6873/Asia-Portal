import { apiGet, apiPost } from "./api";

export type MeetingRoomId = "room-01" | "room-02";

export interface MeetingBooking {
  id: string;
  title: string;
  roomId: MeetingRoomId;
  date: string;
  start: string;
  end: string;
  attendees: number;
  organizer: string;
  email: string;
  department: string;
}

interface MeetingBookingPage {
  items: MeetingBooking[];
  pagination: {
    totalPages: number;
  };
}

export interface StartMeetingBookingInput {
  title: string;
  roomId: MeetingRoomId;
  date: string;
  start: string;
  durationMinutes: number;
  attendees: number;
  organizer: string;
  email: string;
  department: string;
}

export interface OtpRequestResult {
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface BookingOtpRequestResult extends OtpRequestResult {
  requestId: string;
}

export interface OtpResendResult {
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export async function getMeetingBookings(signal?: AbortSignal): Promise<MeetingBooking[]> {
  const firstPage = await apiGet<MeetingBookingPage>("/user/meetings?limit=500&page=1", signal);
  if (firstPage.pagination.totalPages <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
      apiGet<MeetingBookingPage>(`/user/meetings?limit=500&page=${index + 2}`, signal),
    ),
  );

  return [...firstPage.items, ...remainingPages.flatMap((page) => page.items)];
}

export function startMeetingBooking(input: StartMeetingBookingInput): Promise<BookingOtpRequestResult> {
  return apiPost("/user/meetings/booking-requests", input);
}

export function verifyMeetingBooking(requestId: string, code: string): Promise<MeetingBooking> {
  return apiPost("/user/meetings/booking-requests/verify-otp", { requestId, code });
}

export function resendMeetingBookingOtp(requestId: string): Promise<OtpResendResult> {
  return apiPost("/user/meetings/booking-requests/resend-otp", { requestId });
}

export function startMeetingCancellation(bookingId: string): Promise<OtpRequestResult> {
  return apiPost("/user/meetings/cancel-requests", { bookingId });
}

export function verifyMeetingCancellation(bookingId: string, code: string): Promise<MeetingBooking> {
  return apiPost("/user/meetings/cancel-requests/verify-otp", { bookingId, code });
}

export function resendMeetingCancellationOtp(bookingId: string): Promise<OtpResendResult> {
  return apiPost("/user/meetings/cancel-requests/resend-otp", { bookingId });
}
