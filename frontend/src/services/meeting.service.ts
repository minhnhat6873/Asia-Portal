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
  /** The signed-in viewer booked it, so they may cancel it. */
  isMine?: boolean;
}

interface MeetingBookingPage {
  items: MeetingBooking[];
  pagination: {
    totalPages: number;
  };
}

/** Name and email come from the signed-in account; they are not part of the form. */
export interface BookMeetingInput {
  title: string;
  roomId: MeetingRoomId;
  date: string;
  start: string;
  durationMinutes: number;
  attendees: number;
  department: string;
}

export interface MyMeetingBooking extends MeetingBooking { ended: boolean }
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

export function bookMeeting(input: BookMeetingInput): Promise<MeetingBooking> {
  return apiPost("/user/meetings/bookings", input);
}

/** Only the person who booked can cancel (checked by the server). */
export function cancelMyBooking(bookingId: string): Promise<MeetingBooking> {
  return apiPost(`/user/meetings/bookings/${encodeURIComponent(bookingId)}/cancel`, {});
}

export function getMyMeetingBookings(signal?: AbortSignal): Promise<{ upcoming: MyMeetingBooking[]; past: MyMeetingBooking[] }> {
  return apiGet("/user/meetings/mine", signal);
}
