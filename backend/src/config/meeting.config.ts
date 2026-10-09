export const MEETING_ROOMS = [
  { id: "room-01", name: "Phòng 1", floor: "Tầng 1", capacity: 12 },
  { id: "room-02", name: "Phòng 2", floor: "Tầng 1", capacity: 6 },
] as const;

export type MeetingRoomId = (typeof MEETING_ROOMS)[number]["id"];

export const MEETING_TIME_OPTIONS = [
  "08:00", "08:15", "08:30", "08:45",
  "09:00", "09:15", "09:30", "09:45",
  "10:00", "10:15", "10:30", "10:45",
  "11:00", "11:15", "11:30", "11:45",
  "13:00", "13:15", "13:30", "13:45",
  "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45",
  "16:00", "16:15", "16:30", "16:45",
] as const;

export const LUNCH_BREAK_START = "12:00";
export const LUNCH_BREAK_END = "13:00";
export const MIN_MEETING_DURATION_MINUTES = 30;
export const MEETING_DURATION_STEP_MINUTES = 15;
export const MIN_MEETING_GAP_MINUTES = 15;
export const MEETING_TRASH_RETENTION_MS = 12 * 24 * 60 * 60 * 1000;
