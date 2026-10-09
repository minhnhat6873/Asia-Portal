import {
  MAX_OTP_ATTEMPTS,
  MAX_RESEND_COUNT,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
} from "../../config/otp.config";
import { MEETING_ROOMS } from "../../config/meeting.config";
import type { MeetingBooking, MeetingCancelOtp } from "../../interfaces/meeting.interface";
import { meetingBookingRepository } from "../../repositories/user/meeting-booking.repository";
import { meetingCancelOtpRepository } from "../../repositories/user/meeting-cancel-otp.repository";
import { AppError } from "../../utils/errors/AppError";
import { maskEmail } from "../../utils/email/maskEmail";
import { createOtpCode, hashOtp, isOtpMatch } from "../../utils/otp/otp.util";
import { compareTimes, getVietnamNow } from "../../utils/time/vietnamTime";
import { emailService } from "../notification/email.service";

interface CancelableBooking extends MeetingBooking {
  _id: unknown;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function getBookingEmail(booking: MeetingBooking): string {
  const email = booking.email?.trim().toLowerCase();
  if (!email) throw new AppError(400, "Lịch họp không có email để xác nhận hủy.");
  return email;
}

function assertBookingCanBeCancelled(booking: MeetingBooking): void {
  const now = getVietnamNow();
  if (
    booking.date < now.date ||
    (booking.date === now.date && compareTimes(booking.end, now.time) <= 0)
  ) {
    throw new AppError(409, "Cuộc họp đã kết thúc và không thể hủy.");
  }
}

async function getCancelableBooking(bookingId: string): Promise<CancelableBooking> {
  const booking = await meetingBookingRepository.findById(bookingId);
  if (!booking) throw new AppError(404, "Không tìm thấy lịch họp.");

  getBookingEmail(booking);
  assertBookingCanBeCancelled(booking);
  return booking as CancelableBooking;
}

function getEmailDetails(booking: MeetingBooking) {
  const room = MEETING_ROOMS.find(({ id }) => id === booking.roomId);
  if (!room) throw new AppError(400, "Phòng họp của lịch đặt không hợp lệ.");

  return {
    title: booking.title,
    roomName: room.name,
    floor: room.floor,
    date: booking.date.split("-").reverse().join("/"),
    start: booking.start,
    end: booking.end,
    organizer: booking.organizer,
  };
}

function buildStartResponse(email: string) {
  return {
    email: maskEmail(email),
    expiresInSeconds: OTP_EXPIRY_MS / 1000,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
  };
}

async function resendExistingOtp(
  bookingId: string,
  booking: CancelableBooking,
  snapshot: MeetingCancelOtp,
): Promise<{ expiresInSeconds: number; resendAfterSeconds: number }> {
  const now = new Date();
  if (snapshot.otpExpiresAt <= now) {
    await meetingCancelOtpRepository.deleteIfOtpHash(bookingId, snapshot.otpHash);
    throw new AppError(400, "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
  }
  if (snapshot.resendCount >= MAX_RESEND_COUNT) {
    throw new AppError(429, "Bạn đã gửi lại OTP quá nhiều lần.");
  }
  if (snapshot.resendAvailableAt > now) {
    const waitSeconds = Math.ceil((snapshot.resendAvailableAt.getTime() - now.getTime()) / 1000);
    throw new AppError(429, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã.`);
  }

  const code = createOtpCode();
  const claimAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);
  const claimed = await meetingCancelOtpRepository.claimResend(
    bookingId,
    now,
    claimAvailableAt,
    MAX_RESEND_COUNT,
  );

  if (!claimed) {
    const current = await meetingCancelOtpRepository.findByBookingId(bookingId);
    if (!current || current.otpExpiresAt <= new Date()) {
      throw new AppError(400, "Yêu cầu OTP hủy lịch không tồn tại hoặc đã hết hạn.");
    }
    if (current.resendCount >= MAX_RESEND_COUNT) {
      throw new AppError(429, "Bạn đã gửi lại OTP quá nhiều lần.");
    }
    const waitSeconds = Math.max(1, Math.ceil((current.resendAvailableAt.getTime() - now.getTime()) / 1000));
    throw new AppError(429, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã.`);
  }

  const email = getBookingEmail(booking);
  try {
    await emailService.sendMeetingCancelOtp(email, code, getEmailDetails(booking));
  } catch (error) {
    await meetingCancelOtpRepository.rollbackResend(
      bookingId,
      claimed.resendCount,
      claimed.resendAvailableAt,
      snapshot.resendCount,
      snapshot.resendAvailableAt,
    );
    throw error;
  }

  const committed = await meetingCancelOtpRepository.commitResendOtp(
    bookingId,
    claimed.resendCount,
    claimed.resendAvailableAt,
    {
      otpHash: hashOtp("meeting-cancel", bookingId, code),
      otpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      resendAvailableAt: claimed.resendAvailableAt,
      resendCount: claimed.resendCount,
    },
  );
  if (!committed) throw new AppError(503, "Không thể gửi mã OTP. Vui lòng thử lại sau.");

  return {
    expiresInSeconds: OTP_EXPIRY_MS / 1000,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
  };
}

export const meetingCancelOtpService = {
  async start(bookingId: string) {
    const booking = await getCancelableBooking(bookingId);
    const email = getBookingEmail(booking);
    const now = new Date();
    let existing = await meetingCancelOtpRepository.findByBookingIdWithOtpHash(bookingId);

    if (existing && existing.otpExpiresAt > now) {
      if (existing.resendAvailableAt > now) {
        const waitSeconds = Math.ceil((existing.resendAvailableAt.getTime() - now.getTime()) / 1000);
        throw new AppError(429, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã.`);
      }
      await resendExistingOtp(bookingId, booking, existing);
      return buildStartResponse(email);
    }

    if (existing) {
      await meetingCancelOtpRepository.deleteIfOtpHash(bookingId, existing.otpHash);
      existing = await meetingCancelOtpRepository.findByBookingIdWithOtpHash(bookingId);
      if (existing && existing.otpExpiresAt > new Date()) {
        if (existing.resendAvailableAt > new Date()) {
          throw new AppError(429, "Vui lòng đợi trước khi yêu cầu gửi lại mã.");
        }
        await resendExistingOtp(bookingId, booking, existing);
        return buildStartResponse(email);
      }
    }

    const code = createOtpCode();
    const otpHash = hashOtp("meeting-cancel", bookingId, code);
    const createdAt = new Date();

    try {
      await meetingCancelOtpRepository.create({
        bookingId,
        email,
        otpHash,
        otpExpiresAt: new Date(createdAt.getTime() + OTP_EXPIRY_MS),
        otpAttempts: 0,
        resendAvailableAt: new Date(createdAt.getTime() + OTP_RESEND_COOLDOWN_MS),
        resendCount: 0,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;

      existing = await meetingCancelOtpRepository.findByBookingIdWithOtpHash(bookingId);
      if (!existing || existing.otpExpiresAt <= new Date()) {
        throw new AppError(409, "Yêu cầu OTP hủy lịch vừa được thay đổi. Vui lòng thử lại.");
      }
      if (existing.resendAvailableAt > new Date()) {
        const waitSeconds = Math.ceil((existing.resendAvailableAt.getTime() - Date.now()) / 1000);
        throw new AppError(429, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã.`);
      }
      await resendExistingOtp(bookingId, booking, existing);
      return buildStartResponse(email);
    }

    try {
      await emailService.sendMeetingCancelOtp(email, code, getEmailDetails(booking));
    } catch (error) {
      await meetingCancelOtpRepository.deleteIfOtpHash(bookingId, otpHash);
      throw error;
    }

    return buildStartResponse(email);
  },

  async verify(bookingId: string, code: string) {
    const booking = await getCancelableBooking(bookingId);
    const otp = await meetingCancelOtpRepository.findByBookingIdWithOtpHash(bookingId);

    if (!otp) throw new AppError(400, "Yêu cầu OTP hủy lịch không tồn tại.");
    if (otp.otpExpiresAt <= new Date()) {
      await meetingCancelOtpRepository.deleteIfOtpHash(bookingId, otp.otpHash);
      throw new AppError(400, "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
    }
    if (otp.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await meetingCancelOtpRepository.deleteIfOtpHash(bookingId, otp.otpHash);
      throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.");
    }

    const submittedHash = hashOtp("meeting-cancel", bookingId, code);
    if (!isOtpMatch(otp.otpHash, submittedHash)) {
      const updated = await meetingCancelOtpRepository.incrementOtpAttempts(
        bookingId,
        MAX_OTP_ATTEMPTS,
        new Date(),
        otp.otpHash,
      );
      if (!updated || updated.otpAttempts >= MAX_OTP_ATTEMPTS) {
        await meetingCancelOtpRepository.deleteIfOtpHash(bookingId, otp.otpHash);
        throw new AppError(429, "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.");
      }

      throw new AppError(400, `Mã OTP không chính xác. Bạn còn ${MAX_OTP_ATTEMPTS - updated.otpAttempts} lần thử.`);
    }

    const consumedOtp = await meetingCancelOtpRepository.consumeOtp(
      bookingId,
      submittedHash,
      new Date(),
      MAX_OTP_ATTEMPTS,
    );
    if (!consumedOtp) {
      const currentBooking = await meetingBookingRepository.findById(bookingId);
      if (!currentBooking) throw new AppError(404, "Không tìm thấy lịch họp.");
      throw new AppError(400, "Mã OTP đã hết hạn hoặc không còn hiệu lực.");
    }

    assertBookingCanBeCancelled(booking);
    const deletedBooking = await meetingBookingRepository.deleteById(bookingId);
    if (!deletedBooking) {
      await meetingCancelOtpRepository.deleteByBookingId(bookingId);
      throw new AppError(404, "Không tìm thấy lịch họp.");
    }
    await meetingCancelOtpRepository.deleteByBookingId(bookingId);

    return {
      message: "Đã hủy lịch họp.",
      booking: {
        id: String(deletedBooking._id),
        title: deletedBooking.title,
        roomId: deletedBooking.roomId,
        date: deletedBooking.date,
        start: deletedBooking.start,
        end: deletedBooking.end,
        attendees: deletedBooking.attendees,
        organizer: deletedBooking.organizer,
        email: maskEmail(deletedBooking.email),
        department: deletedBooking.department,
      },
    };
  },

  async resend(bookingId: string) {
    const booking = await getCancelableBooking(bookingId);
    const otp = await meetingCancelOtpRepository.findByBookingIdWithOtpHash(bookingId);
    if (!otp || otp.otpExpiresAt <= new Date()) {
      if (otp) await meetingCancelOtpRepository.deleteByBookingId(bookingId);
      throw new AppError(400, "Yêu cầu OTP hủy lịch không tồn tại hoặc đã hết hạn.");
    }

    return resendExistingOtp(bookingId, booking, otp);
  },
};
