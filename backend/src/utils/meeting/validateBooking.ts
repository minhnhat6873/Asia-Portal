import { MEETING_ROOMS, MEETING_TIME_OPTIONS, MIN_MEETING_DURATION_MINUTES, MEETING_DURATION_STEP_MINUTES, LUNCH_BREAK_START, LUNCH_BREAK_END } from "../../config/meeting.config";
import type { StartMeetingBookingInput } from "../../interfaces/meeting.interface";
import { AppError } from "../errors/AppError";
import { addMinutes, compareTimes, getVietnamNow } from "../time/vietnamTime";

export function validateDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function validateBookingInput(input: StartMeetingBookingInput, requireFuture = true): {
  email: string;
  end: string;
  room: (typeof MEETING_ROOMS)[number];
  organizer: string;
} {
  if (input.title.trim().length < 3 || input.title.trim().length > 200) {
    throw new AppError(400, "Tiêu đề cuộc họp phải từ 3 đến 200 ký tự.");
  }
  const organizer = input.organizer.trim().normalize("NFC");
  if (organizer.length < 2 || organizer.length > 100 || !/^[\p{L}\s]+$/u.test(organizer)) {
    throw new AppError(400, "Tên người chủ trì không hợp lệ.");
  }
  const email = input.email.trim().toLowerCase();
  if (email.length > 150 || !/^[a-z0-9._%+-]+@asiafnb\.com$/.test(email)) {
    throw new AppError(400, "Email phải có đuôi @asiafnb.com.");
  }
  if (input.department.trim().length < 2 || input.department.trim().length > 100) {
    throw new AppError(400, "Phòng ban phải từ 2 đến 100 ký tự.");
  }

  const room = MEETING_ROOMS.find(({ id }) => id === input.roomId);
  if (!room) throw new AppError(400, "Phòng họp không hợp lệ.");
  if (!Number.isInteger(input.attendees) || input.attendees < 1 || input.attendees > room.capacity) {
    throw new AppError(400, `Phòng này nhận từ 1 đến ${room.capacity} người.`);
  }
  if (!validateDate(input.date)) throw new AppError(400, "Ngày họp không hợp lệ.");
  if (!MEETING_TIME_OPTIONS.includes(input.start as (typeof MEETING_TIME_OPTIONS)[number])) {
    throw new AppError(400, "Giờ bắt đầu không hợp lệ.");
  }
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < MIN_MEETING_DURATION_MINUTES ||
    (input.durationMinutes - MIN_MEETING_DURATION_MINUTES) % MEETING_DURATION_STEP_MINUTES !== 0
  ) {
    throw new AppError(400, "Thời lượng họp tối thiểu là 30 phút và phải tăng theo bước 15 phút.");
  }

  const now = getVietnamNow();
  if (requireFuture && (input.date < now.date || (input.date === now.date && compareTimes(input.start, now.time) <= 0))) {
    throw new AppError(400, "Ngày và giờ họp phải ở trong tương lai theo giờ Việt Nam.");
  }

  const end = addMinutes(input.start, input.durationMinutes);
  const startMinutes = Number(input.start.slice(0, 2)) * 60 + Number(input.start.slice(3));
  if (startMinutes + input.durationMinutes >= 24 * 60) {
    throw new AppError(400, "Cuộc họp phải kết thúc trong cùng ngày.");
  }
  if (input.start < LUNCH_BREAK_END && end > LUNCH_BREAK_START) {
    throw new AppError(400, "Khung giờ họp không được trùng giờ nghỉ trưa (12:00–13:00).");
  }

  return { email, end, room, organizer };
}

