import type { MeetingBookingListQuery, StartMeetingBookingInput } from "./meeting.interface";

export type AdminMeetingInput = Pick<StartMeetingBookingInput,
  "title" | "organizer" | "email" | "department" | "roomId" | "date" | "start" | "durationMinutes" | "attendees">;
export interface AdminMeetingQuery extends MeetingBookingListQuery {
  status?: "upcoming" | "ongoing" | "ended";
  source?: "active" | "history";
  sort?: "asc" | "desc";
}
export interface MeetingRequestQuery {
  page?: string;
  limit?: string;
}
