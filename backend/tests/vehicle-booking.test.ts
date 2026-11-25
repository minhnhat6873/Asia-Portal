jest.mock("../src/repositories/vehicle-booking.repository", () => ({ vehicleBookingRepository: {
  create: jest.fn(), findById: jest.fn(), findMine: jest.fn(), list: jest.fn(), count: jest.fn(), findForReport: jest.fn(),
  updateIfStatus: jest.fn(), deleteCancelled: jest.fn(), findDepartReminders: jest.fn(), findOverdueForHr: jest.fn(),
  findOverdueEmailDue: jest.fn(), findPendingOverdue: jest.fn(), claimFlag: jest.fn(), managerAccounts: jest.fn(),
} }));
jest.mock("../src/services/vehicle/vehicle-notifier", () => ({
  formatVietnamTime: (value: Date | null) => (value ? value.toISOString() : ""),
  vehicleNotifier: { toRequester: jest.fn(), toHr: jest.fn(), emailRequesterReminder: jest.fn(), emailHrOverdue: jest.fn(), emailRequesterChange: jest.fn(), emailHrNew: jest.fn(), emailHrPendingOverdue: jest.fn() },
}));
jest.mock("../src/utils/vehicle/receipts", () => ({ removeVehicleReceiptFiles: jest.fn() }));
jest.mock("../src/repositories/admin/employee.repository", () => ({ adminEmployeeRepository: { findByEmail: jest.fn().mockResolvedValue({ department: "Sales" }) } }));

import { Types } from "mongoose";
import { vehicleBookingRepository } from "../src/repositories/vehicle-booking.repository";
import { vehicleNotifier } from "../src/services/vehicle/vehicle-notifier";
import { removeVehicleReceiptFiles } from "../src/utils/vehicle/receipts";
import { hrVehicleService, monthRange, userVehicleService, VEHICLE_ALLOW_FUTURE_END } from "../src/services/vehicle/vehicle-booking.service";
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
  departAt: "2026-11-25T10:00", roundTrip: false,
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
    expect(vehicleNotifier.emailHrNew).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }));
  });

  it("needs at least 15 minutes before departure", async () => {
    await expect(userVehicleService.create(user, { ...request, departAt: "2026-11-25T08:10" }))
      .rejects.toMatchObject({ statusCode: 400, fieldErrors: { departAt: expect.stringContaining("15 phút") } });
    await expect(userVehicleService.create(user, { ...request, departAt: "2026-11-25T08:15" })).resolves.toBeDefined();
  });

  it.each([
    [{ purpose: "guest", passengerCount: null }, "passengerCount"],
    [{ purpose: "delivery", senderName: "", senderPhone: "0901234567", receiverName: "Kho B", receiverPhone: "0907654321", goodsDescription: "Hàng mẫu", goodsQuantity: "15 thùng" }, "senderName"],
    [{ purpose: "delivery", senderName: "Kho A", senderPhone: "", receiverName: "Kho B", receiverPhone: "0907654321", goodsDescription: "Hàng mẫu", goodsQuantity: "15 thùng" }, "senderPhone"],
    [{ purpose: "delivery", senderName: "Kho A", senderPhone: "0901234567", receiverName: "", receiverPhone: "0907654321", goodsDescription: "Hàng mẫu", goodsQuantity: "15 thùng" }, "receiverName"],
    [{ purpose: "delivery", senderName: "Kho A", senderPhone: "0901234567", receiverName: "Kho B", receiverPhone: "", goodsDescription: "Hàng mẫu", goodsQuantity: "15 thùng" }, "receiverPhone"],
    [{ purpose: "delivery", senderName: "Kho A", senderPhone: "0901234567", receiverName: "Kho B", receiverPhone: "0907654321", goodsDescription: "", goodsQuantity: "15 thùng" }, "goodsDescription"],
    [{ purpose: "delivery", senderName: "Kho A", senderPhone: "0901234567", receiverName: "Kho B", receiverPhone: "0907654321", goodsDescription: "Hàng mẫu", goodsQuantity: " " }, "goodsQuantity"],
    [{ forOther: true, forOtherName: "", forOtherPhone: "0901234567" }, "forOtherName"],
    [{ forOther: true, forOtherName: "Chị Lan", forOtherPhone: "" }, "forOtherPhone"],
    [{ purpose: "guest", customerName: "" }, "customerName"],
    [{ roundTrip: true, returnAt: null }, "returnAt"],
    [{ roundTrip: true, returnAt: "2026-11-25T09:00" }, "returnAt"],
  ])("rejects %o (%s)", async (change, field) => {
    await expect(userVehicleService.create(user, { ...request, ...change } as VehicleRequestInput)).rejects.toMatchObject({ fieldErrors: { [field]: expect.any(String) } });
  });

  it("rejects bad phones and names, the same pickup and destination, and out-of-range times", async () => {
    const phoneOf = (value: string) => vehicleRequestSchema.validate({ ...request, customerPhone: value });
    // Valid Vietnamese numbers are stored in one plain form.
    for (const [input, stored] of [["0901234567", "0901234567"], ["0901 234 567", "0901234567"], ["090.123.4567", "0901234567"], ["+84 901 234 567", "0901234567"],
      ["84901234567", "0901234567"], ["+84 (0) 901 234 567", "0901234567"], ["0326-123-456", "0326123456"], ["0559 123 456", "0559123456"], ["028 3812 3456", "02838123456"], ["(0274) 381 2345", "02743812345"]]) {
      expect(phoneOf(input).error).toBeUndefined();
      expect(phoneOf(input).value.customerPhone).toBe(stored);
    }
    // Every wrong number gets the same message.
    for (const bad of ["--------", "0901abc567", "090123456", "09012345678", "0951234567", "0121698370", "0111234567", "0401234567", "901234567", "+1 202 555 0123", "028 3812 345"]) {
      expect(phoneOf(bad).error?.message).toBe("Số điện thoại không hợp lệ.");
    }
    await expect(userVehicleService.create(user, { ...request, purpose: "delivery", customerName: "", passengerCount: null, senderName: "Kho A", senderPhone: "0901234567", receiverName: "Kho B", receiverPhone: "0901234567", goodsDescription: "Hàng", goodsQuantity: "1 thùng" }))
      .rejects.toMatchObject({ fieldErrors: { receiverPhone: expect.stringContaining("khác người gửi") } });
    for (const bad of ["1", "12345", "!!!"]) expect(vehicleRequestSchema.validate({ ...request, customerName: bad }).error?.message).toContain("chữ cái");
    expect(vehicleRequestSchema.validate({ ...request, customerName: "Công ty 3M" }).error).toBeUndefined();
    expect(vehicleRequestSchema.validate({ ...request, goodsQuantity: "vài thùng" }).error?.message).toContain("con số");
    expect(vehicleRequestSchema.validate({ ...request, pickup: "A" }).error?.message).toContain("ít nhất 3");
    await expect(userVehicleService.create(user, { ...request, pickup: "Văn  phòng", destination: "văn phòng" })).rejects.toMatchObject({ fieldErrors: { destination: expect.stringContaining("khác điểm đón") } });
    await expect(userVehicleService.create(user, { ...request, departAt: "2027-03-01T08:00" })).rejects.toMatchObject({ fieldErrors: { departAt: expect.stringContaining("90 ngày") } });
    await expect(userVehicleService.create(user, { ...request, roundTrip: true, returnAt: "2026-12-30T08:00" })).rejects.toMatchObject({ fieldErrors: { returnAt: expect.stringContaining("30 ngày") } });
  });

  it("accepts an address or coordinates as the typed pickup", async () => {
    await userVehicleService.create(user, { ...request, pickup: "10.8839, 106.7599" });
    expect(repo.create).toHaveBeenLastCalledWith(expect.objectContaining({ pickup: "10.8839, 106.7599" }));
  });

  it("keeps the pickup position from the device and rejects impossible coordinates", async () => {
    await userVehicleService.create(user, { ...request, pickupLocation: { lat: 10.9, lng: 106.77, accuracy: 25 } });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ pickupLocation: { lat: 10.9, lng: 106.77, accuracy: 25 } }));
    expect(vehicleRequestSchema.validate({ ...request, pickupLocation: { lat: 120, lng: 106 } }).error).toBeDefined();
    expect(vehicleRequestSchema.validate({ ...request, pickupLocation: null }).error).toBeUndefined();
  });

  it("a delivery stores both sides and shows them as the customer", async () => {
    await userVehicleService.create(user, { ...request, purpose: "delivery", customerName: "", passengerCount: null, senderName: "Kho Á Châu", senderPhone: "0901234567", receiverName: "Cửa hàng Q1", receiverPhone: "0907654321", goodsDescription: "Nước đóng chai", goodsQuantity: "10 thùng, 200 kg" });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      customerName: "Kho Á Châu → Cửa hàng Q1", senderPhone: "0901234567", receiverPhone: "0907654321", passengerCount: null, customerPhone: "", goodsQuantity: "10 thùng, 200 kg",
    }));
  });

  it("booking for someone else keeps their name and phone; for oneself clears them", async () => {
    await userVehicleService.create(user, { ...request, forOther: true, forOtherName: "Chị Lan", forOtherPhone: "0901234567" });
    expect(repo.create).toHaveBeenLastCalledWith(expect.objectContaining({ forOther: true, forOtherName: "Chị Lan", forOtherPhone: "0901234567" }));
    await userVehicleService.create(user, { ...request, forOther: false, forOtherName: "Chị Lan", forOtherPhone: "0901234567" });
    expect(repo.create).toHaveBeenLastCalledWith(expect.objectContaining({ forOther: false, forOtherName: "", forOtherPhone: "" }));
    expect(vehicleRequestSchema.validate({ ...request, forOther: true, forOtherPhone: "abc" }).error?.message).toContain("Số điện thoại");
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
  it("HR sets the expected end when arranging; the requester cannot", async () => {
    expect(vehicleRequestSchema.validate({ ...request, expectedEndAt: "2026-11-25T12:00" }).value).not.toHaveProperty("expectedEndAt");
    repo.findById.mockResolvedValue(stored({ expectedEndAt: null }) as never);
    await expect(hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "company" })).rejects.toMatchObject({ fieldErrors: { expectedEndAt: expect.any(String) } });
    await expect(hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "company", expectedEndAt: "2026-11-25T09:00" })).rejects.toMatchObject({ fieldErrors: { expectedEndAt: expect.stringContaining("sau giờ đi") } });
    repo.findById.mockResolvedValue(stored({ expectedEndAt: null, roundTrip: true, returnAt: new Date("2026-11-25T06:00:00Z") }) as never);
    await expect(hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "company", expectedEndAt: "2026-11-25T12:00" })).rejects.toMatchObject({ fieldErrors: { expectedEndAt: expect.stringContaining("giờ về") } });
    repo.findById.mockResolvedValue(stored({ expectedEndAt: null }) as never);
    await hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "company", expectedEndAt: "2026-11-25T12:00" });
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["pending"], { $set: expect.objectContaining({ status: "arranged", expectedEndAt: new Date("2026-11-25T05:00:00Z") }) });
  });

  it("choosing a car arranges the trip; an external car needs an estimated price", async () => {
    repo.findById.mockResolvedValue(stored() as never);
    await expect(hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "external" })).rejects.toMatchObject({ fieldErrors: { estimatedCost: expect.any(String) } });
    const trip = await hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "external", estimatedCost: 150000 });
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["pending"], { $set: expect.objectContaining({ status: "arranged", vehicleType: "external", estimatedCost: 150000 }) });
    expect(trip.status).toBe("arranged");
    expect(vehicleNotifier.toRequester).toHaveBeenLastCalledWith(expect.anything(), "vehicle-arranged", null);
  });

  it("changing the requested time or route needs a reason, which is sent to the requester", async () => {
    repo.findById.mockResolvedValue(stored() as never);
    const arrange = (input: object) => hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "company", ...input });
    // Same time and place as requested: no reason needed, no change recorded.
    await arrange({ departAt: "2026-11-25T10:00", pickup: "Văn phòng" });
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["pending"], { $set: expect.any(Object) });
    expect(vehicleNotifier.emailRequesterChange).not.toHaveBeenCalled();
    // A later car (15:00 → 15:30 style) without a reason is refused.
    await expect(arrange({ departAt: "2026-11-25T10:30" })).rejects.toMatchObject({ fieldErrors: { changeReason: expect.stringContaining("lý do") } });
    await expect(arrange({ departAt: "2026-11-25T10:30", changeReason: "  " })).rejects.toMatchObject({ fieldErrors: { changeReason: expect.any(String) } });
    // With a reason: stored, shown in the web notification and emailed.
    await arrange({ departAt: "2026-11-25T10:30", destination: "Sân bay Long Thành", changeReason: "Xe công ty 10:30 mới rảnh" });
    const change = {
      at: expect.any(Date), by: expect.objectContaining({ name: "Chị HR" }), reason: "Xe công ty 10:30 mới rảnh",
      items: [
        { label: "Giờ đi", from: "2026-11-25T03:00:00.000Z", to: "2026-11-25T03:30:00.000Z" },
        { label: "Điểm đến", from: "Sân bay Tân Sơn Nhất", to: "Sân bay Long Thành" },
      ],
    };
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["pending"], { $set: expect.objectContaining({ departAt: new Date("2026-11-25T03:30:00Z") }), $push: { changes: change } });
    expect(vehicleNotifier.toRequester).toHaveBeenLastCalledWith(expect.anything(), "vehicle-arranged", change);
    expect(vehicleNotifier.emailRequesterChange).toHaveBeenLastCalledWith(expect.anything(), change);
    // A message typed without changing anything is still kept and sent (as a note from HR).
    await arrange({ changeReason: "Tài xế sẽ gọi trước 10 phút" });
    const note = { at: expect.any(Date), by: expect.objectContaining({ name: "Chị HR" }), reason: "Tài xế sẽ gọi trước 10 phút", items: [] };
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["pending"], { $set: expect.any(Object), $push: { changes: note } });
    expect(vehicleNotifier.emailRequesterChange).toHaveBeenLastCalledWith(expect.anything(), note);
    await expect(arrange({ changeReason: "ok" })).rejects.toMatchObject({ fieldErrors: { changeReason: expect.stringContaining("ít nhất 3") } });
    // HR cannot rewrite the requester's own note.
    await arrange({ note: "HR ghi đè" });
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["pending"], { $set: expect.not.objectContaining({ note: "HR ghi đè" }) });
  });

  it("company car with driver details needs no price", async () => {
    repo.findById.mockResolvedValue(stored() as never);
    await hrVehicleService.arrange(hr, String(new Types.ObjectId()), { vehicleType: "company", driverName: "Anh Tài", driverPlate: "51A-12345", driverPhone: "0901234567" });
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["pending"], { $set: expect.objectContaining({ vehicleType: "company", estimatedCost: null, driverPlate: "51A-12345" }) });
  });

  it("closing an external trip needs the real price; HR may close at any time after arranging", async () => {
    // 13:00 Vietnam time, after the 10:00 departure.
    jest.setSystemTime(new Date("2026-11-25T06:00:00Z"));
    const end = "2026-11-25T12:30";
    repo.findById.mockResolvedValue(stored({ status: "arranged", vehicleType: "external", estimatedCost: 150000 }) as never);
    await expect(hrVehicleService.complete(hr, String(new Types.ObjectId()), { actualCost: null, actualEndAt: end }, [])).rejects.toMatchObject({ fieldErrors: { actualCost: expect.any(String) } });
    await expect(hrVehicleService.complete(hr, String(new Types.ObjectId()), { actualCost: 172000, actualEndAt: end }, [])).resolves.toMatchObject({ status: "completed", actualCost: 172000 });
    repo.findById.mockResolvedValue(stored({ status: "pending" }) as never);
    await expect(hrVehicleService.complete(hr, String(new Types.ObjectId()), { actualCost: null, actualEndAt: end }, [])).rejects.toMatchObject({ statusCode: 409 });
  });

  it("closing a trip records when it really ended: after departure and not in the future", async () => {
    jest.setSystemTime(new Date("2026-11-25T06:00:00Z"));
    repo.findById.mockResolvedValue(stored({ status: "arranged", vehicleType: "company" }) as never);
    const close = (actualEndAt: string) => hrVehicleService.complete(hr, String(new Types.ObjectId()), { actualEndAt }, []);
    await expect(close("")).rejects.toMatchObject({ fieldErrors: { actualEndAt: expect.stringContaining("Vui lòng chọn") } });
    await expect(close("2026-11-25T10:00")).rejects.toMatchObject({ fieldErrors: { actualEndAt: expect.stringContaining("sau giờ đi") } });
    // While VEHICLE_ALLOW_FUTURE_END is on (temporary, for testing) a future end is accepted.
    if (VEHICLE_ALLOW_FUTURE_END) await expect(close("2026-11-25T14:00")).resolves.toMatchObject({ status: "completed" });
    else await expect(close("2026-11-25T14:00")).rejects.toMatchObject({ fieldErrors: { actualEndAt: expect.stringContaining("tương lai") } });
    await close("2026-11-25T12:30");
    expect(repo.updateIfStatus).toHaveBeenLastCalledWith(expect.any(String), ["arranged"], expect.objectContaining({
      $set: expect.objectContaining({ status: "completed", actualEndAt: new Date("2026-11-25T05:30:00Z"), actualCost: null }),
    }));
    expect(vehicleCompleteSchema.validate({}).error?.message).toContain("hoàn thành thật");
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
    repo.findPendingOverdue.mockResolvedValue([] as never);
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
    repo.findPendingOverdue.mockResolvedValue([] as never);
    repo.claimFlag.mockResolvedValue(false);
    await runVehicleReminders(NOW);
    expect(vehicleNotifier.toRequester).not.toHaveBeenCalled();
  });

  it("a request still waiting 5 minutes after its departure: web to both sides and email to HR, once", async () => {
    const trip = stored({ status: "pending" });
    repo.findDepartReminders.mockResolvedValue([] as never);
    repo.findOverdueForHr.mockResolvedValue([] as never);
    repo.findOverdueEmailDue.mockResolvedValue([] as never);
    repo.findPendingOverdue.mockResolvedValue([trip] as never);
    repo.claimFlag.mockResolvedValueOnce(true);
    await runVehicleReminders(NOW);
    expect(repo.findPendingOverdue).toHaveBeenCalledWith(new Date(NOW.getTime() - 5 * 60_000));
    expect(repo.claimFlag).toHaveBeenCalledWith(trip._id, "pendingOverdueNotifiedAt");
    expect(vehicleNotifier.toHr).toHaveBeenCalledWith(trip, "vehicle-pending-overdue");
    expect(vehicleNotifier.toRequester).toHaveBeenCalledWith(trip, "vehicle-pending-overdue");
    expect(vehicleNotifier.emailHrPendingOverdue).toHaveBeenCalledWith(trip);

    jest.clearAllMocks();
    repo.findPendingOverdue.mockResolvedValue([trip] as never);
    repo.claimFlag.mockResolvedValue(false);
    await runVehicleReminders(NOW);
    expect(vehicleNotifier.emailHrPendingOverdue).not.toHaveBeenCalled();
  });
});
