import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import mongoose from "mongoose";

import type { MeetingBooking } from "../src/interfaces/meeting.interface";
import MeetingBookingModel from "../src/models/meeting-booking.model";
import { meetingBookingRepository } from "../src/repositories/user/meeting-booking.repository";

// Chạy trên MongoDB thật vì chống đặt trùng phòng dựa vào unique index, không thể chứng minh bằng mock.
// Dùng biến riêng TEST_DATABASE, không dùng DATABASE, để test không bao giờ chạm vào database đang chạy.
// Không chạy trong Jest: driver MongoDB không bắt tay được với server bên trong sandbox của Jest.
const DUPLICATE_KEY = { code: 11000 };

function booking(overrides: Partial<MeetingBooking> = {}): MeetingBooking {
  return {
    title: "Họp kiểm thử",
    roomId: "room-01",
    date: "2030-01-15",
    start: "09:00",
    end: "10:00",
    attendees: 4,
    organizer: "Nguyen Van A",
    email: "test@asiafnb.com",
    department: "IT",
    ...overrides,
  };
}

describe("meeting booking on a real MongoDB", () => {
  before(async () => {
    const databaseUrl = process.env.TEST_DATABASE?.trim();
    if (!databaseUrl) throw new Error("TEST_DATABASE is required for integration tests.");

    await mongoose.connect(databaseUrl, { serverSelectionTimeoutMS: 5000 });
    if (!mongoose.connection.name.endsWith("_test")) {
      await mongoose.disconnect();
      throw new Error("TEST_DATABASE must point to a database whose name ends with _test.");
    }
    await MeetingBookingModel.init();
  });

  beforeEach(async () => {
    await MeetingBookingModel.deleteMany({});
  });

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  it("lets only one of several simultaneous overlapping requests win", async () => {
    const results = await Promise.allSettled([
      meetingBookingRepository.create(booking({ organizer: "Nguoi Mot" })),
      meetingBookingRepository.create(booking({ organizer: "Nguoi Hai" })),
      meetingBookingRepository.create(booking({ organizer: "Nguoi Ba", start: "09:30", end: "10:30" })),
      meetingBookingRepository.create(booking({ organizer: "Nguoi Bon", start: "08:30", end: "09:15" })),
    ]);

    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(results.length - rejected.length, 1);
    for (const result of rejected) assert.equal(result.reason.code, DUPLICATE_KEY.code);
    assert.equal(await MeetingBookingModel.countDocuments(), 1);
  });

  it("enforces the 15 minute gap but allows the next free slot", async () => {
    await meetingBookingRepository.create(booking());

    await assert.rejects(meetingBookingRepository.create(booking({ start: "10:00", end: "10:30" })), DUPLICATE_KEY);
    const next = await meetingBookingRepository.create(booking({ start: "10:15", end: "11:00" }));
    assert.equal(next?.start, "10:15");
  });

  it("keeps rooms and dates independent", async () => {
    await meetingBookingRepository.create(booking());

    const otherRoom = await meetingBookingRepository.create(booking({ roomId: "room-02" }));
    const otherDate = await meetingBookingRepository.create(booking({ date: "2030-01-16" }));
    assert.equal(otherRoom?.roomId, "room-02");
    assert.equal(otherDate?.date, "2030-01-16");
  });

  it("finds overlaps, hides internal slots and frees the slot after deletion", async () => {
    const created = await meetingBookingRepository.create(booking());
    assert.ok(created);
    assert.equal("reservationSlots" in created, false);

    const overlap = await meetingBookingRepository.findOverlapping("room-01", "2030-01-15", "10:00", "10:30");
    assert.equal(overlap?.start, "09:00");
    assert.equal(await meetingBookingRepository.findOverlapping("room-01", "2030-01-15", "10:15", "11:00"), null);

    await meetingBookingRepository.deleteById(String(created._id));
    const rebooked = await meetingBookingRepository.create(booking());
    assert.equal(rebooked?.start, "09:00");
  });
});
