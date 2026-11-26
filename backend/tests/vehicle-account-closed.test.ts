jest.mock("../src/repositories/vehicle-booking.repository", () => ({ vehicleBookingRepository: { findOpenByRequester: jest.fn(), updateIfStatus: jest.fn() } }));
jest.mock("../src/services/vehicle/vehicle-notifier", () => ({ vehicleNotifier: { toHr: jest.fn() } }));

import { vehicleBookingRepository } from "../src/repositories/vehicle-booking.repository";
import { vehicleNotifier } from "../src/services/vehicle/vehicle-notifier";
import { vehicleAccountClosedService } from "../src/services/vehicle/vehicle-account-closed";

const repo = jest.mocked(vehicleBookingRepository);
const admin = { accountId: "a1", name: "Admin", email: "admin@asiafnb.com" };
const trips = [{ _id: "t1", status: "pending" }, { _id: "t2", status: "arranged" }];

beforeEach(() => jest.clearAllMocks());

it("cancels the requester's trips that have not happened yet and tells HR once per trip", async () => {
  repo.findOpenByRequester.mockResolvedValue(trips as never);
  repo.updateIfStatus.mockImplementation(((id: string) => Promise.resolve({ _id: id, status: "cancelled" })) as never);
  expect(await vehicleAccountClosedService.cancelOpenTrips("u1", "deleted", admin)).toBe(2);
  expect(repo.findOpenByRequester).toHaveBeenCalledWith("u1");
  expect(repo.updateIfStatus).toHaveBeenCalledWith("t1", ["pending"], { $set: expect.objectContaining({
    status: "cancelled", cancel: expect.objectContaining({ by: admin, byRequester: false, reason: "Tài khoản người đặt đã bị xóa." }),
  }) });
  expect(vehicleNotifier.toHr).toHaveBeenCalledTimes(2);
  expect(vehicleNotifier.toHr).toHaveBeenCalledWith(expect.objectContaining({ _id: "t1" }), "vehicle-requester-removed");
});

it("an automatic lock (employee left) is cancelled by \"Hệ thống\"; a trip changed meanwhile is skipped", async () => {
  repo.findOpenByRequester.mockResolvedValue(trips as never);
  repo.updateIfStatus.mockResolvedValueOnce({ _id: "t1" } as never).mockResolvedValueOnce(null);
  expect(await vehicleAccountClosedService.cancelOpenTrips("u1", "locked")).toBe(1);
  expect(repo.updateIfStatus).toHaveBeenCalledWith("t1", ["pending"], { $set: expect.objectContaining({
    cancel: expect.objectContaining({ by: { accountId: "", name: "Hệ thống", email: "" }, reason: "Tài khoản người đặt đã bị khóa." }),
  }) });
  expect(vehicleNotifier.toHr).toHaveBeenCalledTimes(1);
});

it("never breaks the account change that triggered it", async () => {
  repo.findOpenByRequester.mockRejectedValue(new Error("db down"));
  const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
  await expect(vehicleAccountClosedService.cancelOpenTrips("u1", "deleted")).resolves.toBe(0);
  log.mockRestore();
});
