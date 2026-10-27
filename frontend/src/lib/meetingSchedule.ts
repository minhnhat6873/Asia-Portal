export const MEETING_CLOSE_TIME = "17:00";
export const MIN_MEETING_MINUTES = 30;

export function meetingMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function getMeetingDurationOptions(start: string): number[] {
  const minutes = meetingMinutes(start);
  if (!Number.isFinite(minutes) || minutes < 8 * 60 || (minutes >= 12 * 60 && minutes < 13 * 60)) return [];
  const limit = meetingMinutes(MEETING_CLOSE_TIME);
  return Array.from({ length: Math.max(0, Math.floor((limit - minutes - MIN_MEETING_MINUTES) / 15) + 1) }, (_, index) => MIN_MEETING_MINUTES + index * 15);
}

export const MEETING_START_TIMES = Array.from({ length: 35 }, (_, index) => {
  const minutes = 8 * 60 + index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}).filter((time) => getMeetingDurationOptions(time).length > 0);

export function getVietnamBookingNow(now = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

export function getFutureMeetingTimes(date: string, now = new Date()): string[] {
  const current = getVietnamBookingNow(now);
  return MEETING_START_TIMES.filter((time) => date > current.date || (date === current.date && time > current.time));
}

type MeetingBusyPeriod = { roomId: string; date: string; start: string; end: string };

/** Fit the full meeting and its 15-minute gap, scoped to the selected room/day. */
export function getAvailableMeetingDurations(start: string, date: string, roomId: string, bookings: readonly MeetingBusyPeriod[]): number[] {
  const startMinutes = meetingMinutes(start);
  const busy = bookings.filter((booking) => booking.roomId === roomId && booking.date === date);
  return getMeetingDurationOptions(start).filter((duration) => {
    const endMinutes = startMinutes + duration;
    if (startMinutes < 13 * 60 && endMinutes > 12 * 60) return false;
    return !busy.some((booking) => startMinutes < meetingMinutes(booking.end) + 15 && endMinutes + 15 > meetingMinutes(booking.start));
  });
}

export function getMeetingStartOptions(date: string, roomId: string, bookings: readonly MeetingBusyPeriod[], now = new Date()) {
  return getFutureMeetingTimes(date, now).map((value) => {
    const durations = getAvailableMeetingDurations(value, date, roomId, bookings);
    const reason = durations.length ? "" : value === "11:45" ? "Giờ nghỉ trưa" : "Đã có lịch";
    return { value, disabled: durations.length === 0, label: reason ? `${value} — ${reason}` : value };
  });
}

export function getNextMeetingSlot(now = new Date()): { date: string; start: string } {
  const { date } = getVietnamBookingNow(now);
  const start = getFutureMeetingTimes(date, now).find((time) => time <= "11:30" || time >= "13:00");
  if (start) return { date, start };
  const tomorrow = new Date(`${date}T00:00:00+07:00`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { date: getVietnamBookingNow(tomorrow).date, start: MEETING_START_TIMES[0] };
}
