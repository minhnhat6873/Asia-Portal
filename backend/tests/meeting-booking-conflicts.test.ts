import { Types } from "mongoose";
import { userMeetingBookingService, type BookMeetingInput } from "../src/services/user/meeting-booking.service";
import { meetingBookingRepository } from "../src/repositories/user/meeting-booking.repository";
import { notificationService } from "../src/services/user/notification.service";
import type { AuthenticatedAccount } from "../src/interfaces/account.interface";
import type { MeetingBooking } from "../src/interfaces/meeting.interface";

jest.mock("../src/repositories/user/meeting-booking.repository", () => ({ meetingBookingRepository: {
  findOverlapping: jest.fn(), create: jest.fn(), findById: jest.fn(), deleteById: jest.fn(),
} }));
jest.mock("../src/services/user/notification.service", () => ({ notificationService: {
  bookingConfirmed: jest.fn().mockResolvedValue(undefined), withdrawBooking: jest.fn().mockResolvedValue(undefined),
} }));
jest.mock("../src/jobs/meeting-booking-reminder.job", () => ({ remindMeetingBookingIfDue: jest.fn().mockResolvedValue(undefined) }));

const { getReservationSlots } = jest.requireActual<typeof import("../src/repositories/user/meeting-booking.repository")>("../src/repositories/user/meeting-booking.repository");
const repo = jest.mocked(meetingBookingRepository);
const account: AuthenticatedAccount = { id: new Types.ObjectId().toString(), name: "Nguyễn Văn An", email: "an@asiafnb.com", status: "active", role: "user", permissions: [] };
const other: AuthenticatedAccount = { ...account, id: new Types.ObjectId().toString(), name: "Trần Bình", email: "binh@asiafnb.com" };
const input: BookMeetingInput = { title: "Họp nội bộ", department: "IT", roomId: "room-01", date: "2026-10-28", start: "09:00", durationMinutes: 60, attendees: 2 };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-27T01:00:00Z"));
  repo.findOverlapping.mockResolvedValue(null);
  repo.create.mockImplementation(async (data) => ({ ...data, _id: new Types.ObjectId() }) as never);
});
afterEach(() => jest.useRealTimers());

test("booking uses the signed-in account's name and email, not form values", async () => {
  const forged = { ...input, organizer: "Giám đốc", email: "ceo@asiafnb.com" } as BookMeetingInput;
  const booking = await userMeetingBookingService.book(account, forged);
  expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ organizer: account.name, email: account.email }));
  expect(booking).toMatchObject({ organizer: account.name, email: account.email, end: "10:00" });
  expect(notificationService.bookingConfirmed).toHaveBeenCalledWith(account.id, expect.objectContaining({ title: input.title }));
});

test("an existing overlap is rejected before saving", async () => {
  repo.findOverlapping.mockResolvedValue({ _id: new Types.ObjectId() } as never);
  await expect(userMeetingBookingService.book(account, input)).rejects.toMatchObject({ statusCode: 409 });
  expect(repo.create).not.toHaveBeenCalled();
  expect(notificationService.bookingConfirmed).not.toHaveBeenCalled();
});

test("a meeting in the past cannot be booked", async () => {
  await expect(userMeetingBookingService.book(account, { ...input, date: "2026-10-26" })).rejects.toMatchObject({ statusCode: 400 });
  expect(repo.create).not.toHaveBeenCalled();
});

test.each([["09:00", 60], ["09:30", 60], ["10:00", 30]])("concurrent overlapping bookings %s (+%i min) yield one winner", async (start, durationMinutes) => {
  const taken = new Set<string>();
  repo.create.mockImplementation(async (data) => {
    const slots = getReservationSlots(data.date, data.start, data.end).map((slot) => `${data.roomId}:${slot}`);
    // Emulate the database unique index after both optimistic pre-checks passed.
    if (slots.some((slot) => taken.has(slot))) throw Object.assign(new Error("duplicate reserved slot"), { code: 11000 });
    slots.forEach((slot) => taken.add(slot));
    return { ...data, _id: new Types.ObjectId() } as never;
  });
  const results = await Promise.allSettled([
    userMeetingBookingService.book(account, input),
    userMeetingBookingService.book(other, { ...input, start, durationMinutes }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const loser = results.find((result) => result.status === "rejected");
  expect(loser).toMatchObject({ status: "rejected", reason: { statusCode: 409, message: expect.stringContaining("Vui lòng chọn giờ khác") } });
});

const stored = (email: string, date = "2026-10-28", end = "10:00") => ({
  _id: new Types.ObjectId(), title: "Họp", roomId: "room-01", date, start: "09:00", end, attendees: 2,
  organizer: "Nguyễn Văn An", email, department: "IT", updatedAt: new Date(),
}) as MeetingBooking & { _id: Types.ObjectId };

test("the owner can cancel their booking; reminders are withdrawn", async () => {
  const booking = stored(account.email);
  repo.findById.mockResolvedValue(booking as never);
  repo.deleteById.mockResolvedValue(booking as never);
  await expect(userMeetingBookingService.cancel(account, String(booking._id))).resolves.toMatchObject({ id: String(booking._id) });
  expect(repo.deleteById).toHaveBeenCalledWith(String(booking._id), undefined, booking);
  expect(notificationService.withdrawBooking).toHaveBeenCalledWith(String(booking._id));
});

test("nobody can cancel someone else's booking", async () => {
  const booking = stored(account.email);
  repo.findById.mockResolvedValue(booking as never);
  await expect(userMeetingBookingService.cancel(other, String(booking._id))).rejects.toMatchObject({ statusCode: 404 });
  expect(repo.deleteById).not.toHaveBeenCalled();
});

test("an ended meeting cannot be cancelled and invalid ids are rejected", async () => {
  repo.findById.mockResolvedValue(stored(account.email, "2026-10-26") as never);
  await expect(userMeetingBookingService.cancel(account, new Types.ObjectId().toString())).rejects.toMatchObject({ statusCode: 409 });
  await expect(userMeetingBookingService.cancel(account, "not-an-id")).rejects.toMatchObject({ statusCode: 404 });
  expect(repo.deleteById).not.toHaveBeenCalled();
});

test("reservation keys release at exactly 15 minutes and are isolated by day", () => {
  const booked = new Set(getReservationSlots(input.date, "09:00", "10:00"));
  expect(getReservationSlots(input.date, "10:15", "11:00").some((slot) => booked.has(slot))).toBe(false);
  expect(getReservationSlots(input.date, "08:00", "08:45").some((slot) => booked.has(slot))).toBe(false);
  expect(getReservationSlots(input.date, "08:00", "09:00").some((slot) => booked.has(slot))).toBe(true);
  expect(getReservationSlots("2026-10-29", "09:00", "10:00").some((slot) => booked.has(slot))).toBe(false);
});
