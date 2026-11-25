jest.mock("../src/repositories/vehicle-booking.repository", () => ({ vehicleBookingRepository: { managerAccounts: jest.fn() } }));
jest.mock("../src/repositories/user/notification.repository", () => ({ notificationRepository: { insertForAccounts: jest.fn(), replaceForAccounts: jest.fn() } }));
jest.mock("../src/services/notification/email.service", () => ({ emailService: { sendNotice: jest.fn() } }));

import { EventEmitter } from "node:events";
import type { Request, Response } from "express";
import { Types } from "mongoose";

import { vehicleBookingRepository } from "../src/repositories/vehicle-booking.repository";
import { notificationRepository } from "../src/repositories/user/notification.repository";
import { emailService } from "../src/services/notification/email.service";
import { vehicleNotifier } from "../src/services/vehicle/vehicle-notifier";
import { openNotificationStream } from "../src/utils/notification/notificationEvents";
import type { StoredVehicleBooking } from "../src/interfaces/vehicle-booking.interface";

const managers = [
  { id: "hr-a", email: "a@asiafnb.com", name: "HR A" },
  { id: "hr-b", email: "b@asiafnb.com", name: "HR B" },
];
const trip = {
  _id: new Types.ObjectId(), purpose: "guest", customerName: "Công ty ABC", passengerCount: 3,
  requester: { accountId: "u1", name: "Nguyễn Văn An", email: "an@asiafnb.com", department: "Sales" },
  departAt: new Date("2026-11-25T03:00:00Z"), pickup: "Văn phòng", destination: "Sân bay", status: "pending",
} as unknown as StoredVehicleBooking;

/** Opens an admin stream for the account, like a browser with /admin open; returns how to close it. */
function openAdmin(accountId: string) {
  const request = new EventEmitter() as unknown as Request;
  const response = { status: jest.fn().mockReturnThis(), setHeader: jest.fn(), flushHeaders: jest.fn(), write: jest.fn(), end: jest.fn() } as unknown as Response;
  openNotificationStream(request, response, accountId, "admin");
  return () => (request as unknown as EventEmitter).emit("close");
}

// Each test starts well after the previous one, so a stream closed there no longer counts as open.
let clock = Date.parse("2026-11-25T01:00:00Z");
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  clock += 10 * 60_000;
  jest.setSystemTime(clock);
  jest.mocked(vehicleBookingRepository.managerAccounts).mockResolvedValue(managers);
});
afterEach(() => jest.useRealTimers());

describe("email to HR for a new request", () => {
  it("is not sent while any vehicle manager has the admin site open", async () => {
    const close = openAdmin("hr-b");
    await vehicleNotifier.emailHrNew(trip);
    expect(emailService.sendNotice).not.toHaveBeenCalled();
    close();
    // Closed a moment ago: could be the browser reconnecting, still no email.
    await vehicleNotifier.emailHrNew(trip);
    expect(emailService.sendNotice).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_000);
    await vehicleNotifier.emailHrNew(trip);
    expect(emailService.sendNotice).toHaveBeenCalledTimes(2);
  });

  it("goes to every vehicle manager when nobody has it open", async () => {
    await vehicleNotifier.emailHrNew(trip);
    expect(emailService.sendNotice).toHaveBeenCalledTimes(2);
    expect(emailService.sendNotice).toHaveBeenCalledWith("a@asiafnb.com", expect.objectContaining({ greeting: "Xin chào HR A,", heading: "Có yêu cầu đặt xe mới" }));
  });

  it("the user portal open does not count", async () => {
    const request = new EventEmitter() as unknown as Request;
    const response = { status: jest.fn().mockReturnThis(), setHeader: jest.fn(), flushHeaders: jest.fn(), write: jest.fn(), end: jest.fn() } as unknown as Response;
    openNotificationStream(request, response, "hr-a", "user");
    await vehicleNotifier.emailHrNew(trip);
    expect(emailService.sendNotice).toHaveBeenCalledTimes(2);
    (request as unknown as EventEmitter).emit("close");
  });

  it("one failed address does not stop the others or break the request", async () => {
    jest.mocked(emailService.sendNotice).mockRejectedValueOnce(new Error("SMTP down"));
    const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(vehicleNotifier.emailHrNew(trip)).resolves.toBeUndefined();
    expect(emailService.sendNotice).toHaveBeenCalledWith("b@asiafnb.com", expect.anything());
    log.mockRestore();
  });
});

describe("request still waiting after its departure time", () => {
  it("emails every vehicle manager, even those with the site open", async () => {
    const close = openAdmin("hr-a");
    await vehicleNotifier.emailHrPendingOverdue(trip);
    expect(emailService.sendNotice).toHaveBeenCalledTimes(2);
    expect(emailService.sendNotice).toHaveBeenCalledWith("b@asiafnb.com", expect.objectContaining({ heading: "Yêu cầu đặt xe đã quá giờ đi 5 phút mà chưa được xử lý" }));
    close();
  });

  it("tells the requester on the website to contact HR", async () => {
    await vehicleNotifier.toRequester(trip, "vehicle-pending-overdue");
    expect(notificationRepository.insertForAccounts).toHaveBeenCalledWith(["u1"], expect.objectContaining({
      type: "vehicle-pending-overdue", title: "Yêu cầu đặt xe của bạn chưa được HR xử lý",
      message: expect.stringContaining("vui lòng liên hệ HR"),
    }));
  });
});
