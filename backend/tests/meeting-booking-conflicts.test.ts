import { Types } from "mongoose";
import { meetingBookingOtpService } from "../src/services/user/meeting-booking-otp.service";
import { meetingBookingRepository } from "../src/repositories/user/meeting-booking.repository";
import { pendingMeetingBookingRepository } from "../src/repositories/user/pending-meeting-booking.repository";
import { emailService } from "../src/services/notification/email.service";
import { hashOtp } from "../src/utils/otp/otp.util";
import type { PendingMeetingBooking, StartMeetingBookingInput } from "../src/interfaces/meeting.interface";

jest.mock("../src/repositories/user/meeting-booking.repository", () => ({ meetingBookingRepository: { findOverlapping: jest.fn(), create: jest.fn() } }));
jest.mock("../src/repositories/user/pending-meeting-booking.repository", () => ({ pendingMeetingBookingRepository: {
  countActiveByEmail: jest.fn(), create: jest.fn(), deleteById: jest.fn(), findByIdWithOtpHash: jest.fn(), consumeOtp: jest.fn(),
} }));
jest.mock("../src/services/notification/email.service", () => ({ emailService: { sendMeetingBookingOtp: jest.fn() } }));
jest.mock("../src/jobs/meeting-booking-reminder.job", () => ({ remindMeetingBookingIfDue: jest.fn().mockResolvedValue(undefined) }));

const { getReservationSlots } = jest.requireActual<typeof import("../src/repositories/user/meeting-booking.repository")>("../src/repositories/user/meeting-booking.repository");
const repo = jest.mocked(meetingBookingRepository);
const pendingRepo = jest.mocked(pendingMeetingBookingRepository);
const input: StartMeetingBookingInput = { title: "Họp nội bộ", organizer: "Nguyễn Văn An", email: "an@asiafnb.com", department: "IT", roomId: "room-01", date: "2026-10-28", start: "09:00", durationMinutes: 60, attendees: 2 };
const ids = [new Types.ObjectId().toString(), new Types.ObjectId().toString()];
const originalSecret = process.env.OTP_SECRET;
const pending = (id: string, start = "09:00", end = "10:00"): PendingMeetingBooking => ({
  ...input, start, end, otpHash: hashOtp("meeting-create", id, "123456"), otpExpiresAt: new Date("2026-10-27T03:00:00Z"),
  otpAttempts: 0, resendCount: 0, resendAvailableAt: new Date("2026-10-27T02:00:00Z"),
});

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-27T01:00:00Z"));
  process.env.OTP_SECRET = "meeting-conflict-test-secret";
  repo.findOverlapping.mockResolvedValue(null);
  pendingRepo.countActiveByEmail.mockResolvedValue(0);
  pendingRepo.create.mockImplementation(async (data) => ({ ...data, _id: new Types.ObjectId() }) as never);
  pendingRepo.consumeOtp.mockResolvedValue({} as never);
  pendingRepo.deleteById.mockResolvedValue(null);
  jest.mocked(emailService.sendMeetingBookingOtp).mockResolvedValue(undefined);
});
afterEach(() => jest.useRealTimers());
afterAll(() => { if (originalSecret === undefined) delete process.env.OTP_SECRET; else process.env.OTP_SECRET = originalSecret; });

test("sending OTP creates only a pending request and does not reserve the room", async () => {
  await expect(meetingBookingOtpService.start(input)).resolves.toHaveProperty("requestId");
  expect(pendingRepo.create).toHaveBeenCalledTimes(1);
  expect(repo.create).not.toHaveBeenCalled();
  expect(emailService.sendMeetingBookingOtp).toHaveBeenCalledTimes(1);
});

test("an existing overlap is rejected before generating or emailing an OTP", async () => {
  repo.findOverlapping.mockResolvedValue({ _id: new Types.ObjectId() } as never);
  await expect(meetingBookingOtpService.start(input)).rejects.toMatchObject({ statusCode: 409 });
  expect(pendingRepo.create).not.toHaveBeenCalled();
  expect(emailService.sendMeetingBookingOtp).not.toHaveBeenCalled();
});

test("a booking made while the OTP is pending is rejected again on verification", async () => {
  pendingRepo.findByIdWithOtpHash.mockResolvedValue(pending(ids[0]) as never);
  repo.findOverlapping.mockResolvedValue({ _id: new Types.ObjectId() } as never);
  await expect(meetingBookingOtpService.verify(ids[0], "123456")).rejects.toMatchObject({ statusCode: 409 });
  expect(pendingRepo.consumeOtp).not.toHaveBeenCalled();
  expect(repo.create).not.toHaveBeenCalled();
});

test.each([["09:00", "10:00"], ["09:30", "10:30"], ["10:00", "10:30"]])("concurrent verification of overlapping %s–%s yields one winner", async (start, end) => {
  pendingRepo.findByIdWithOtpHash.mockImplementation((id) => pending(id, id === ids[0] ? "09:00" : start, id === ids[0] ? "10:00" : end) as never);
  const taken = new Set<string>();
  repo.create.mockImplementation(async (data) => {
    const slots = getReservationSlots(data.date, data.start, data.end).map((slot) => `${data.roomId}:${slot}`);
    // Emulate the database unique index after both optimistic pre-checks passed.
    if (slots.some((slot) => taken.has(slot))) throw Object.assign(new Error("duplicate reserved slot"), { code: 11000 });
    slots.forEach((slot) => taken.add(slot));
    return { ...data, _id: new Types.ObjectId() } as never;
  });
  const results = await Promise.allSettled(ids.map((id) => meetingBookingOtpService.verify(id, "123456")));
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const loser = results.find((result) => result.status === "rejected");
  expect(loser).toMatchObject({ status: "rejected", reason: { statusCode: 409, message: expect.stringContaining("Vui lòng chọn giờ khác") } });
});

test("reservation keys release at exactly 15 minutes and are isolated by day", () => {
  const booked = new Set(getReservationSlots(input.date, "09:00", "10:00"));
  expect(getReservationSlots(input.date, "10:15", "11:00").some((slot) => booked.has(slot))).toBe(false);
  expect(getReservationSlots(input.date, "08:00", "08:45").some((slot) => booked.has(slot))).toBe(false);
  expect(getReservationSlots(input.date, "08:00", "09:00").some((slot) => booked.has(slot))).toBe(true);
  expect(getReservationSlots("2026-10-29", "09:00", "10:00").some((slot) => booked.has(slot))).toBe(false);
});
