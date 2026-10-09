import { Types } from "mongoose";

import {
  MAX_OTP_ATTEMPTS,
  MAX_PENDING_PER_EMAIL,
  MAX_RESEND_COUNT,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
} from "../../config/otp.config";
import { MEETING_ROOMS, MEETING_TIME_OPTIONS } from "../../config/meeting.config";
import type {
  MeetingBooking,
  PendingMeetingBooking,
  StartMeetingBookingInput,
} from "../../interfaces/meeting.interface";
import { meetingBookingRepository } from "../../repositories/user/meeting-booking.repository";
import { pendingMeetingBookingRepository } from "../../repositories/user/pending-meeting-booking.repository";
import { emailService } from "../notification/email.service";
import { AppError } from "../../utils/errors/AppError";
import { maskEmail } from "../../utils/email/maskEmail";
import { hashOtp, createOtpCode, isOtpMatch } from "../../utils/otp/otp.util";
import { addMinutes, compareTimes, getVietnamNow } from "../../utils/time/vietnamTime";

const BOOKING_CONFLICT_MESSAGE =
  "Phòng đã có lịch trùng hoặc chưa đủ 15 phút nghỉ giữa các cuộc họp. Vui lòng chọn giờ khác.";

interface PublicMeetingBooking extends Omit<MeetingBooking, "email"> {
  id: string;
  email: string;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function toPublicBooking(booking: MeetingBooking & { _id: unknown }): PublicMeetingBooking {
  return {
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
  };
}

function validateDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function validateBookingInput(input: StartMeetingBookingInput): {
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
    input.durationMinutes < 30 ||
    (input.durationMinutes - 30) % 15 !== 0
  ) {
    throw new AppError(400, "Thời lượng họp tối thiểu là 30 phút và phải tăng theo bước 15 phút.");
  }

  const now = getVietnamNow();
  if (input.date < now.date || (input.date === now.date && compareTimes(input.start, now.time) <= 0)) {
    throw new AppError(400, "Ngày và giờ họp phải ở trong tương lai theo giờ Việt Nam.");
  }

  const end = addMinutes(input.start, input.durationMinutes);
  const startMinutes = Number(input.start.slice(0, 2)) * 60 + Number(input.start.slice(3));
  if (startMinutes + input.durationMinutes >= 24 * 60) {
    throw new AppError(400, "Cuộc họp phải kết thúc trong cùng ngày.");
  }
  if (input.start < "13:00" && end > "12:00") {
    throw new AppError(400, "Khung giờ họp không được trùng giờ nghỉ trưa (12:00–13:00).");
  }

  return { email, end, room, organizer };
}

async function requireActivePending(
  pending: PendingMeetingBooking | null,
  requestId: string,
): Promise<PendingMeetingBooking> {
  if (!pending) throw new AppError(400, "Yêu cầu đặt phòng không tồn tại hoặc đã hết hạn.");
  if (pending.otpExpiresAt <= new Date()) {
    await pendingMeetingBookingRepository.deleteById(requestId);
    throw new AppError(400, "Mã OTP đã hết hạn. Vui lòng bắt đầu lại yêu cầu đặt phòng.");
  }
  return pending;
}

function revalidatePendingBooking(pending: PendingMeetingBooking): void {
  const room = MEETING_ROOMS.find(({ id }) => id === pending.roomId);
  if (!room || pending.attendees < 1 || pending.attendees > room.capacity) {
    throw new AppError(400, "Số người tham dự không phù hợp với phòng họp.");
  }
  if (!validateDate(pending.date) || !MEETING_TIME_OPTIONS.includes(pending.start as (typeof MEETING_TIME_OPTIONS)[number])) {
    throw new AppError(400, "Ngày hoặc giờ họp không hợp lệ.");
  }

  const now = getVietnamNow();
  if (pending.date < now.date || (pending.date === now.date && compareTimes(pending.start, now.time) <= 0)) {
    throw new AppError(400, "Ngày và giờ họp đã qua. Vui lòng bắt đầu lại yêu cầu đặt phòng.");
  }
  if (compareTimes(pending.start, pending.end) >= 0) {
    throw new AppError(400, "Giờ kết thúc cuộc họp không hợp lệ.");
  }
  if (pending.start < "13:00" && pending.end > "12:00") {
    throw new AppError(400, "Khung giờ họp không được trùng giờ nghỉ trưa (12:00–13:00).");
  }
}

export const meetingBookingOtpService = {
  async start(input: StartMeetingBookingInput): Promise<{
    requestId: string;
    email: string;
    expiresInSeconds: number;
    resendAfterSeconds: number;
  }> {
    const { email, end, room, organizer } = validateBookingInput(input);
    const conflict = await meetingBookingRepository.findOverlapping(
      room.id,
      input.date,
      input.start,
      end,
    );
    if (conflict) throw new AppError(409, BOOKING_CONFLICT_MESSAGE);

    const activePendingCount = await pendingMeetingBookingRepository.countActiveByEmail(email);
    if (activePendingCount >= MAX_PENDING_PER_EMAIL) {
      throw new AppError(429, "Email này đã có quá nhiều yêu cầu đặt phòng đang chờ xác thực.");
    }

    const requestId = new Types.ObjectId().toString();
    const now = new Date();
    const code = createOtpCode();
    const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
    const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);
    const pending = await pendingMeetingBookingRepository.create(
      {
        title: input.title.trim(),
        roomId: room.id,
        date: input.date,
        start: input.start,
        end,
        attendees: input.attendees,
        organizer,
        email,
        department: input.department.trim(),
        otpHash: hashOtp("meeting-create", requestId, code),
        otpExpiresAt,
        otpAttempts: 0,
        resendAvailableAt,
        resendCount: 0,
      },
      requestId,
    );

    if (!pending) {
      throw new AppError(429, "Email này đã có quá nhiều yêu cầu đặt phòng đang chờ xác thực.");
    }

    try {
      await emailService.sendMeetingBookingOtp(email, code, {
        title: pending.title,
        roomName: room.name,
        floor: room.floor,
        date: pending.date.split("-").reverse().join("/"),
        start: pending.start,
        end: pending.end,
        organizer: pending.organizer,
      });
    } catch (error) {
      await pendingMeetingBookingRepository.deleteById(requestId);
      throw error;
    }

    return {
      requestId,
      email,
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
    };
  },

  async verify(requestId: string, code: string): Promise<{
    message: string;
    booking: PublicMeetingBooking;
  }> {
    const pending = await requireActivePending(
      await pendingMeetingBookingRepository.findByIdWithOtpHash(requestId),
      requestId,
    );

    if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await pendingMeetingBookingRepository.deleteById(requestId);
      throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Yêu cầu đặt phòng đã bị hủy.");
    }

    if (!isOtpMatch(pending.otpHash, hashOtp("meeting-create", requestId, code))) {
      const updated = await pendingMeetingBookingRepository.incrementOtpAttempts(
        requestId,
        MAX_OTP_ATTEMPTS,
      );
      if (!updated || updated.otpAttempts >= MAX_OTP_ATTEMPTS) {
        await pendingMeetingBookingRepository.deleteById(requestId);
        throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Yêu cầu đặt phòng đã bị hủy.");
      }

      throw new AppError(400, `Mã OTP không chính xác. Bạn còn ${MAX_OTP_ATTEMPTS - updated.otpAttempts} lần thử.`);
    }

    revalidatePendingBooking(pending);
    const conflict = await meetingBookingRepository.findOverlapping(
      pending.roomId,
      pending.date,
      pending.start,
      pending.end,
    );
    if (conflict) throw new AppError(409, BOOKING_CONFLICT_MESSAGE);

    let booking;
    try {
      booking = await meetingBookingRepository.create({
        title: pending.title,
        roomId: pending.roomId,
        date: pending.date,
        start: pending.start,
        end: pending.end,
        attendees: pending.attendees,
        organizer: pending.organizer,
        email: pending.email,
        department: pending.department,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new AppError(409, BOOKING_CONFLICT_MESSAGE);
      throw error;
    }

    if (!booking) throw new AppError(500, "Không thể hoàn tất đặt phòng họp.");
    await pendingMeetingBookingRepository.deleteById(requestId);

    return { message: "Đặt phòng họp thành công.", booking: toPublicBooking(booking as MeetingBooking & { _id: unknown }) };
  },

  async resend(requestId: string): Promise<{ expiresInSeconds: number; resendAfterSeconds: number }> {
    const pending = await requireActivePending(
      await pendingMeetingBookingRepository.findById(requestId),
      requestId,
    );

    const now = new Date();
    if (pending.resendCount >= MAX_RESEND_COUNT) {
      throw new AppError(429, "Bạn đã gửi lại OTP quá nhiều lần.");
    }
    if (pending.resendAvailableAt > now) {
      const waitSeconds = Math.ceil((pending.resendAvailableAt.getTime() - now.getTime()) / 1000);
      throw new AppError(429, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã.`);
    }

    const code = createOtpCode();
    const claimAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);
    const claimed = await pendingMeetingBookingRepository.claimResend(
      requestId,
      now,
      claimAvailableAt,
      MAX_RESEND_COUNT,
    );
    if (!claimed) {
      const current = await requireActivePending(
        await pendingMeetingBookingRepository.findById(requestId),
        requestId,
      );
      if (current.resendCount >= MAX_RESEND_COUNT) {
        throw new AppError(429, "Bạn đã gửi lại OTP quá nhiều lần.");
      }
      const waitSeconds = Math.max(1, Math.ceil((current.resendAvailableAt.getTime() - now.getTime()) / 1000));
      throw new AppError(429, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã.`);
    }

    try {
      const room = MEETING_ROOMS.find(({ id }) => id === claimed.roomId);
      if (!room) throw new AppError(400, "Phòng họp không hợp lệ.");

      await emailService.sendMeetingBookingOtp(claimed.email, code, {
        title: claimed.title,
        roomName: room.name,
        floor: room.floor,
        date: claimed.date.split("-").reverse().join("/"),
        start: claimed.start,
        end: claimed.end,
        organizer: claimed.organizer,
      });
    } catch (error) {
      await pendingMeetingBookingRepository.rollbackResend(
        requestId,
        claimed.resendCount,
        claimed.resendAvailableAt,
        pending.resendCount,
        pending.resendAvailableAt,
      );
      throw error;
    }

    const committed = await pendingMeetingBookingRepository.commitResendOtp(
      requestId,
      claimed.resendCount,
      claimed.resendAvailableAt,
      {
        otpHash: hashOtp("meeting-create", requestId, code),
        otpExpiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
        resendAvailableAt: claimed.resendAvailableAt,
        resendCount: claimed.resendCount,
      },
    );
    if (!committed) throw new AppError(503, "Không thể gửi mã OTP. Vui lòng thử lại sau.");

    return {
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
    };
  },
};
