jest.mock("../src/repositories/vehicle-booking.repository", () => ({ vehicleBookingRepository: {
  create: jest.fn(), findById: jest.fn(), findMine: jest.fn(), list: jest.fn(), count: jest.fn(), findForReport: jest.fn(),
  updateIfStatus: jest.fn(), deleteCancelled: jest.fn(), findDepartReminders: jest.fn(), findOverdueForHr: jest.fn(),
  findOverdueEmailDue: jest.fn(), claimFlag: jest.fn(), managerAccounts: jest.fn(),
} }));
jest.mock("../src/services/vehicle/vehicle-notifier", () => ({
  formatVietnamTime: () => "",
  vehicleNotifier: { toRequester: jest.fn(), toHr: jest.fn(), emailRequesterReminder: jest.fn(), emailHrOverdue: jest.fn() },
}));
jest.mock("../src/utils/vehicle/receipts", () => ({ removeVehicleReceiptFiles: jest.fn() }));
jest.mock("../src/repositories/admin/employee.repository", () => ({ adminEmployeeRepository: { findByEmail: jest.fn().mockResolvedValue({ department: "Sales" }) } }));

import { Types } from "mongoose";
import { vehicleBookingRepository } from "../src/repositories/vehicle-booking.repository";
import { vehicleNotifier } from "../src/services/vehicle/vehicle-notifier";
import { removeVehicleReceiptFiles } from "../src/utils/vehicle/receipts";
import { hrVehicleService, monthRange, userVehicleService } from "../src/services/vehicle/vehicle-booking.service";
import { runVehicleReminders } from "../src/jobs/vehicle-booking-reminder.job";
import { vehicleArrangeSchema, vehicleCompleteSchema, vehicleHrCancelSchema, vehicleRequestSchema } from "../src/validates/vehicle-booking.validate";
import type { AuthenticatedAccount } from "../src/interfaces/account.interface";
import type { VehicleRequestInput } from "../src/interfaces/vehicle-booking.interface";

const repo = jest.mocked(vehicleBookingRepository);
const user: AuthenticatedAccount = { id: "u1", name: "Nguyễn Văn An", email: "an@asiafnb.com", role: "user", permissions: [] };
const hr: AuthenticatedAccount = { id: "h1", name: "Chị HR", email: "hr@asiafnb.com", role: "manager", permissions: ["vehicles:manage"] };
// 2026-11-25 08:00 Vietnam = 01:00 UTC.
const NOW = new Date("2026-11-25T01:00:00Z");
const request: VehicleRequestInput = {
  purpose: "guest", customerName: "Công ty ABC", passengerCount: 3, pickup: "Văn phòng", destination: "Sân bay Tân Sơn Nhất",
  departAt: "2026-11-25T10:00", roundTrip: false, expectedEndAt: "2026-11-25T12:00",
};
const stored = (extra: object = {}) => ({
  _id: new Types.ObjectId(), requester: { accountId: "u1", name: user.name, email: user.email, department: "Sales" },
  ...request, departAt: new Date("2026-11-25T03:00:00Z"), expectedEndAt: new Date("2026-11-25T05:00:00Z"),
  status: "pending", vehicleType: null, receipts: [], ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  repo.create.mockImplementation(async (data) => ({ _id: new Types.ObjectId(), ...data }) as never);
  repo.updateIfStatus.mockImplementation(((_id: string, _statuses: string[], update: { $set: object }) => Promise.resolve({ ...stored(), ...update.$set })) as never);
});
afterEach(() => jest.useRealTimers());

describe("requester", () => {
  it("creates a request with the account's name and department, and tells HR", async () => {
    const trip = await userVehicleService.create(user, request);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      status: "pending", requester: { accountId: "u1", name: user.name, email: user.email, department: "Sales" },
      departAt: new Date("2026-11-25T03:00:00Z"),
    }));
    expect(trip.status).toBe("pending");
    expect(vehicleNotifier.toHr).toHaveBeenCalledWith(expect.anything(), "vehicle-new");
  });

  it("needs at least 15 minutes before departure", async () => {
    await expect(userVehicleService.create(user, { ...request, departAt: "2026-11-25T08:10", expectedEndAt: "2026-11-25T09:00" }))
      .rejects.toMatchObject({ statusCode: 400, fieldErrors: { departAt: expect.stringContaining("15 phút") } });
    await expect(userVehicleService.create(user, { ...request, departAt: "2026-11-25T08:15", expectedEndAt: "2026-11-25T09:00" })).resolves.toBeDefined();
  });

  it.each([
    [{ purpose: "guest", passengerCount: null }, "passengerCount"],
    [{ purpose: "delivery", senderName: "", senderPhone: "0901234567", receiverName: "Kho B", receiverPhone: "0907654321", goodsDescription: "Hàng mẫu" }, "senderName"],
    [{ purpose: "delivery", senderName: "Kho A", senderPhone: "", receiverName: "Kho B", receiverPhone: "0907654321", goodsDescription: "Hàng mẫu" }, "senderPhone"],
    [{ purpose: "delivery", senderName: "Kho A", senderPhone: "0901234567", receiverName: "", receiverPhone: "0907654321", goodsDescription: "Hàng mẫu" }, "receiverName"],
    [{ purpose: "delivery", senderName: "Kho A", senderPhone: "0901234567", receiverName: "Kho B", receiverPhone: "", goodsDescription: "Hàng mẫu" }, "receiverPhone"],
    [{ purpose: "delivery", senderName: "Kho A", senderPhone: "0901234567", receiverName: "Kho B", receiverPhone: "0907654321", goodsDescription: "" }, "goodsDescription"],
    [{ purpose: "guest", customerName: "" }, "customerName"],
    [{ roundTrip: true, returnAt: null }, "returnAt"],
    [{ roundTrip: true, returnAt: "2026-11-25T09:00" }, "returnAt"],
    [{ roundTrip: true, returnAt: "2026-11-25T13:00" }, "expectedEndAt"],
    [{ expectedEndAt: "2026-11-25T09:00" }, "expectedEndAt"],
  ])("rejects %o (%s)", async (change, field) => {
    await expect(userVehicleService.create(user, { ...request, ...change } as VehicleRequestInput)).rejects.toMatchObject({ fieldErrors: { [field]: expect.any(String) } });
  });

  it("a delivery stores both sides and shows them as the customer", async () => {
    await userVehicleService.create(user, { ...request, purpose: "delivery", customerName: "", passengerCount: null, senderName: "Kho Á Châu", senderPhone: "0901234567", receiverName: "Cửa hàng Q1", receiverPhone: "0907654321", goodsDescription: "10 thùng nước" });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      customerName: "Kho Á Châu → Cửa hàng Q1", senderPhone: "0901234567", receiverPhone: "0907654321", passengerCount: null, customerPhone: "",
    }));
  });

  it("can edit or cancel only while HR has not arranged a car, and only their own trip", async () => {
    repo.findById.mockResolvedValueOnce(stored({ status: "arranged" }) as never);
    await expect(userVehicleService.cancel(user, String(new Types.ObjectId()))).rejects.toMatchObject({ statusCode: 409 });
    repo.findById.mockResolvedValueOnce(stored({ requester: { accountId: "other" } }) as never);
    await expect(userVehicleService.update(user, String(new Types.ObjectId()), { note: "x" })).rejects.toMatchObject({ statusCode: 404 });
    repo.findById.mockResolvedValueOnce(stored() as never);
    await expect(userVehicleService.cancel(user, String(new Types.ObjectId()))).resolves.toMatchObject({ status: "cancelled" });
  });

  it("'Đã đi xong' tells HR; pictures are dropped if the trip cannot take them", async () => {
    repo.findById.mockResolvedValueOnce(stored({ status: "arranged", vehicleType: "company" }) as never);
    const trip = await userVehicleService.markArrived(user, String(new Types.ObjectId()), [{ url: "u", publicId: "asia-portal/vehicle-receipts/a" }]);
    expect(trip.status).toBe("arrived");
    expect(vehicleNotifier.toHr).toHaveBeenCalledWith(expect.anything(), "vehicle-arrived");

    repo.findById.mockResolvedValueOnce(stored({ status: "pending" }) as never);
    await expect(userVehicleService.markArrived(user, String(new Types.ObjectId()), [{ url: "u", publicId: "asia-portal/vehicle-receipts/b" }])).rejects.toMatchObject({ statusCode: 409 });
    expect(removeVehicleReceiptFiles).toHaveBeenLastCalledWith(["asia-portal/vehicle-receipts/b"]);
  });
});

describe("HR", () => {
  it("choosing a car arranges the trip; an external car needs an estimated price", async () => {
    repo.findById.mockResolvedValue(stored() as never);
    await expect(hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "external" })).rejects.toMatchObject({ fieldErrors: { estimatedCost: expect.any(String) } });
    const trip = await hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "external", estimatedCost: 150000 });
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["pending"], { $set: expect.objectContaining({ status: "arranged", vehicleType: "external", estimatedCost: 150000 }) });
    expect(trip.status).toBe("arranged");
    expect(vehicleNotifier.toRequester).toHaveBeenLastCalledWith(expect.anything(), "vehicle-arranged");
  });

  it("company car with driver details needs no price", async () => {
    repo.findById.mockResolvedValue(stored() as never);
    await hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "company", driverName: "Anh Tài", driverPlate: "51A-12345", driverPhone: "0901234567" });
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["pending"], { $set: expect.objectContaining({ vehicleType: "company", estimatedCost: null, driverPlate: "51A-12345" }) });
  });

  it("closing an external trip needs the real price; HR may close at any time after arranging", async () => {
    repo.findById.mockResolvedValue(stored({ status: "arranged", vehicleType: "external", estimatedCost: 150000 }) as never);
    await expect(hrVehicleService.complete(hr, String(new Types.ObjectId()), null, [])).rejects.toMatchObject({ fieldErrors: { actualCost: expect.any(String) } });
    await expect(hrVehicleService.complete(hr, String(new Types.ObjectId()), 172000, [])).resolves.toMatchObject({ status: "completed", actualCost: 172000 });
    repo.findById.mockResolvedValue(stored({ status: "pending" }) as never);
    await expect(hrVehicleService.complete(hr, String(new Types.ObjectId()), null, [])).rejects.toMatchObject({ statusCode: 409 });
  });

  it("only cancelled trips can be deleted", async () => {
    repo.deleteCancelled.mockResolvedValueOnce(null as never);
    await expect(hrVehicleService.remove(String(new Types.ObjectId()))).rejects.toMatchObject({ statusCode: 409 });
    repo.deleteCancelled.mockResolvedValueOnce(stored({ status: "cancelled", receipts: [{ publicId: "asia-portal/vehicle-receipts/z" }] }) as never);
    await hrVehicleService.remove(String(new Types.ObjectId()));
    expect(removeVehicleReceiptFiles).toHaveBeenLastCalledWith(["asia-portal/vehicle-receipts/z"]);
  });

  it("the monthly report counts only closed external trips at their real price", async () => {
    repo.findForReport.mockResolvedValue([
      stored({ status: "completed", vehicleType: "external", actualCost: 100000 }),
      stored({ status: "completed", vehicleType: "external", actualCost: 50000, requester: { accountId: "x", name: "B", email: "b", department: "Kho" } }),
      stored({ status: "completed", vehicleType: "company" }),
      stored({ status: "arrived", vehicleType: "external", estimatedCost: 999999 }),
      stored({ status: "cancelled", vehicleType: "external", actualCost: 777 }),
    ] as never);
    const report = await hrVehicleService.report("2026-11");
    expect(report.totals).toMatchObject({ trips: 5, completed: 3, companyTrips: 1, externalTrips: 2, externalCost: 150000, cancelled: 1, notClosed: 1 });
    expect(report.byDepartment).toEqual([{ name: "Sales", trips: 1, cost: 100000 }, { name: "Kho", trips: 1, cost: 50000 }]);
  });

  it("months follow Vietnam time", () => {
    expect(monthRange("2026-12")).toEqual({ from: new Date("2026-11-30T17:00:00Z"), to: new Date("2026-12-31T17:00:00Z") });
  });
});

describe("validation", () => {
  it("HR cancel needs a reason; prices are whole VND", () => {
    expect(vehicleHrCancelSchema.validate({}).error?.message).toContain("lý do");
    expect(vehicleArrangeSchema.validate({ estimatedCost: 1500.5 }).error).toBeDefined();
    expect(vehicleCompleteSchema.validate({ actualCost: "172000" }).value).toEqual({ actualCost: 172000 });
    expect(vehicleRequestSchema.validate({ ...request, departAt: "25/11/2026 10:00" }).error).toBeDefined();
  });
});

describe("reminders", () => {
  it("sends each reminder once: requester before departure, HR on overdue, HR email 30 minutes later", async () => {
    const trip = stored({ status: "arranged" });
    repo.findDepartReminders.mockResolvedValue([trip] as never);
    repo.findOverdueForHr.mockResolvedValue([trip] as never);
    repo.findOverdueEmailDue.mockResolvedValue([trip] as never);
    repo.claimFlag.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await runVehicleReminders(NOW);
    expect(vehicleNotifier.toRequester).toHaveBeenCalledWith(trip, "vehicle-reminder");
    expect(vehicleNotifier.emailRequesterReminder).toHaveBeenCalledWith(trip);
    expect(vehicleNotifier.toHr).toHaveBeenCalledWith(trip, "vehicle-overdue");
    expect(vehicleNotifier.emailHrOverdue).toHaveBeenCalledWith(trip);
    expect(repo.findOverdueEmailDue).toHaveBeenCalledWith(new Date(NOW.getTime() - 30 * 60_000));

    jest.clearAllMocks();
    repo.findDepartReminders.mockResolvedValue([trip] as never);
    repo.findOverdueForHr.mockResolvedValue([] as never);
    repo.findOverdueEmailDue.mockResolvedValue([] as never);
    repo.claimFlag.mockResolvedValue(false);
    await runVehicleReminders(NOW);
    expect(vehicleNotifier.toRequester).not.toHaveBeenCalled();
  });
});
