import mongoose, { type QueryFilter, type UpdateQuery } from "mongoose";

import type { AuthenticatedAccount } from "../../interfaces/account.interface";
import type {
  StoredVehicleBooking,
  VehicleArrangeInput,
  VehicleBooking,
  VehicleListQuery,
  VehiclePerson,
  VehicleReceipt,
  VehicleRequestInput,
} from "../../interfaces/vehicle-booking.interface";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";
import { vehicleBookingRepository } from "../../repositories/vehicle-booking.repository";
import { AppError } from "../../utils/errors/AppError";
import { escapeRegex } from "../../utils/regex/escapeRegex";
import { getVietnamDateTimeAsUtc } from "../../utils/time/vietnamTime";
import { removeVehicleReceiptFiles } from "../../utils/vehicle/receipts";
import { vehicleNotifier } from "./vehicle-notifier";

/** Requests must be sent at least this long before departure, so HR can arrange a car. */
export const VEHICLE_MIN_LEAD_MINUTES = 15;
const MAX_RECEIPTS = 6;
const MY_TRIPS_DAYS = 60;

export interface UploadedReceipt { url: string; publicId: string }

const person = (account: AuthenticatedAccount): VehiclePerson => ({ accountId: account.id, name: account.name, email: account.email });

function parseLocal(value: string): Date {
  const [date, time] = value.split("T");
  const parsed = getVietnamDateTimeAsUtc(date, time);
  if (Number.isNaN(parsed.getTime())) throw new AppError(400, "Thời gian không hợp lệ.");
  return parsed;
}

function ensureId(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, "Không tìm thấy chuyến xe.");
}

const fieldError = (field: string, message: string) => new AppError(400, message, { [field]: message });

/** Turns form values into stored fields and checks times and purpose-specific fields. */
function buildTrip(input: Partial<VehicleRequestInput>, current: Partial<VehicleBooking> | null, options: { requireLead: boolean }) {
  const next: Partial<VehicleBooking> = {};
  const has = (key: keyof VehicleRequestInput) => input[key] !== undefined;
  for (const key of ["purpose", "customerName", "customerPhone", "goodsDescription", "senderName", "senderPhone", "receiverName", "receiverPhone", "pickup", "destination", "note", "roundTrip"] as const) {
    if (has(key)) (next as Record<string, unknown>)[key] = input[key];
  }
  if (has("passengerCount")) next.passengerCount = input.passengerCount ?? null;
  if (has("departAt")) next.departAt = parseLocal(input.departAt!);
  if (has("expectedEndAt")) next.expectedEndAt = parseLocal(input.expectedEndAt!);
  if (has("returnAt")) next.returnAt = input.returnAt ? parseLocal(input.returnAt) : null;

  const merged = { ...current, ...next };
  if (!merged.roundTrip) next.returnAt = null;
  const purpose = merged.purpose;
  if (purpose === "guest") {
    if (!merged.customerName?.trim()) throw fieldError("customerName", "Vui lòng nhập tên khách hoặc công ty.");
    if (!merged.passengerCount) throw fieldError("passengerCount", "Vui lòng nhập số người.");
    if (has("purpose")) Object.assign(next, { goodsDescription: "", senderName: "", senderPhone: "", receiverName: "", receiverPhone: "" });
  }
  if (purpose === "delivery") {
    const required: [keyof VehicleBooking, string][] = [
      ["senderName", "Vui lòng nhập tên người gửi."], ["senderPhone", "Vui lòng nhập số điện thoại người gửi."],
      ["receiverName", "Vui lòng nhập tên người nhận."], ["receiverPhone", "Vui lòng nhập số điện thoại người nhận."],
      ["goodsDescription", "Vui lòng mô tả hàng hóa."],
    ];
    for (const [field, message] of required) if (!String(merged[field] ?? "").trim()) throw fieldError(field, message);
    // Lists and reports show the two sides as the "customer".
    next.customerName = `${String(merged.senderName).trim()} → ${String(merged.receiverName).trim()}`;
    next.customerPhone = "";
    next.passengerCount = null;
  }

  const departAt = merged.departAt!;
  if (options.requireLead && (has("departAt") || !current) && departAt.getTime() < Date.now() + VEHICLE_MIN_LEAD_MINUTES * 60_000) {
    throw fieldError("departAt", `Vui lòng đặt xe trước giờ đi ít nhất ${VEHICLE_MIN_LEAD_MINUTES} phút.`);
  }
  const returnAt = merged.roundTrip ? (next.returnAt !== undefined ? next.returnAt : merged.returnAt) : null;
  if (merged.roundTrip && !returnAt) throw fieldError("returnAt", "Vui lòng chọn giờ về.");
  if (returnAt && returnAt <= departAt) throw fieldError("returnAt", "Giờ về phải sau giờ đi.");
  const expectedEndAt = merged.expectedEndAt!;
  if (expectedEndAt <= departAt) throw fieldError("expectedEndAt", "Thời gian hoàn thành dự kiến phải sau giờ đi.");
  if (returnAt && expectedEndAt < returnAt) throw fieldError("expectedEndAt", "Thời gian hoàn thành dự kiến không được trước giờ về.");
  // A changed time starts the reminders again.
  if (has("departAt")) (next as Record<string, unknown>).departReminderSentAt = null;
  if (has("expectedEndAt")) Object.assign(next, { hrOverdueNotifiedAt: null, hrOverdueEmailedAt: null });
  return next;
}

function toResponse(trip: StoredVehicleBooking) {
  return {
    id: String(trip._id),
    requester: trip.requester,
    purpose: trip.purpose,
    customerName: trip.customerName,
    customerPhone: trip.customerPhone ?? "",
    passengerCount: trip.passengerCount ?? null,
    goodsDescription: trip.goodsDescription ?? "",
    senderName: trip.senderName ?? "",
    senderPhone: trip.senderPhone ?? "",
    receiverName: trip.receiverName ?? "",
    receiverPhone: trip.receiverPhone ?? "",
    pickup: trip.pickup,
    destination: trip.destination,
    departAt: trip.departAt,
    roundTrip: trip.roundTrip,
    returnAt: trip.returnAt ?? null,
    expectedEndAt: trip.expectedEndAt,
    note: trip.note ?? "",
    status: trip.status,
    vehicleType: trip.vehicleType ?? null,
    driverName: trip.driverName ?? "",
    driverPlate: trip.driverPlate ?? "",
    driverPhone: trip.driverPhone ?? "",
    estimatedCost: trip.estimatedCost ?? null,
    actualCost: trip.actualCost ?? null,
    receipts: (trip.receipts ?? []).map(({ url, uploadedBy, at }) => ({ url, uploadedBy, at })),
    arrangedBy: trip.arrangedBy ? { name: trip.arrangedBy.name } : null,
    arrivedAt: trip.arrivedAt ?? null,
    completedAt: trip.completedAt ?? null,
    completedBy: trip.completedBy ? { name: trip.completedBy.name } : null,
    cancel: trip.cancel ? { byName: trip.cancel.by?.name ?? "", byRequester: trip.cancel.byRequester, reason: trip.cancel.reason, at: trip.cancel.at } : null,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}
export type VehicleBookingResponse = ReturnType<typeof toResponse>;

const changedElsewhere = () => new AppError(409, "Chuyến xe vừa được thay đổi. Vui lòng tải lại.");
const receiptsFrom = (uploads: UploadedReceipt[], by: VehicleReceipt["uploadedBy"]): VehicleReceipt[] =>
  uploads.map((upload) => ({ ...upload, uploadedBy: by, at: new Date() }));

async function loadOwn(account: AuthenticatedAccount, id: string) {
  ensureId(id);
  const trip = await vehicleBookingRepository.findById(id) as StoredVehicleBooking | null;
  if (!trip || trip.requester.accountId !== account.id) throw new AppError(404, "Không tìm thấy chuyến xe của bạn.");
  return trip;
}

/** The requester's side (user portal). */
export const userVehicleService = {
  async create(account: AuthenticatedAccount, input: VehicleRequestInput) {
    const trip = buildTrip(input, null, { requireLead: true });
    const employee = await adminEmployeeRepository.findByEmail(account.email);
    const created = await vehicleBookingRepository.create({
      ...trip, status: "pending", receipts: [],
      requester: { ...person(account), department: employee?.department ?? "" },
    }) as StoredVehicleBooking;
    await vehicleNotifier.toHr(created, "vehicle-new");
    return toResponse(created);
  },

  async mine(account: AuthenticatedAccount) {
    const since = new Date(Date.now() - MY_TRIPS_DAYS * 24 * 60 * 60_000);
    return (await vehicleBookingRepository.findMine(account.id, since) as StoredVehicleBooking[]).map(toResponse);
  },

  /** Only while HR has not arranged a car yet. */
  async update(account: AuthenticatedAccount, id: string, input: Partial<VehicleRequestInput>) {
    const trip = await loadOwn(account, id);
    if (trip.status !== "pending") throw new AppError(409, "HR đã sắp xếp xe. Muốn thay đổi, vui lòng liên hệ HR.");
    const update = buildTrip(input, trip, { requireLead: true });
    const saved = await vehicleBookingRepository.updateIfStatus(id, ["pending"], { $set: update }, { "requester.accountId": account.id });
    if (!saved) throw changedElsewhere();
    return toResponse(saved as StoredVehicleBooking);
  },

  async cancel(account: AuthenticatedAccount, id: string, reason = "") {
    const trip = await loadOwn(account, id);
    if (trip.status !== "pending") throw new AppError(409, "HR đã sắp xếp xe. Muốn hủy, vui lòng liên hệ HR.");
    const saved = await vehicleBookingRepository.updateIfStatus(id, ["pending"], {
      $set: { status: "cancelled", cancel: { by: person(account), byRequester: true, reason: reason.trim() || "Người đặt hủy yêu cầu.", at: new Date() } },
    }, { "requester.accountId": account.id });
    if (!saved) throw changedElsewhere();
    return toResponse(saved as StoredVehicleBooking);
  },

  /** "Đã đi xong": tells HR the trip is over so they can close it. Pictures are optional. */
  async markArrived(account: AuthenticatedAccount, id: string, uploads: UploadedReceipt[]) {
    try {
      const trip = await loadOwn(account, id);
      if (trip.status !== "arranged") throw new AppError(409, trip.status === "pending" ? "HR chưa sắp xếp xe cho chuyến này." : "Chuyến xe không còn ở trạng thái đang đi.");
      if ((trip.receipts?.length ?? 0) + uploads.length > MAX_RECEIPTS) throw new AppError(400, `Mỗi chuyến tối đa ${MAX_RECEIPTS} ảnh.`);
      const saved = await vehicleBookingRepository.updateIfStatus(id, ["arranged"], {
        // HR is told now; if nobody closes the trip within 30 minutes an email follows.
        $set: { status: "arrived", arrivedAt: new Date(), hrOverdueNotifiedAt: new Date(), hrOverdueEmailedAt: null },
        $push: { receipts: { $each: receiptsFrom(uploads, "requester") } },
      }, { "requester.accountId": account.id });
      if (!saved) throw changedElsewhere();
      await vehicleNotifier.toHr(saved as StoredVehicleBooking, "vehicle-arrived");
      return toResponse(saved as StoredVehicleBooking);
    } catch (error) {
      await removeVehicleReceiptFiles(uploads.map((upload) => upload.publicId));
      throw error;
    }
  },
};

function listFilter(query: VehicleListQuery): QueryFilter<VehicleBooking> {
  const filter: QueryFilter<VehicleBooking> = {};
  if (query.status) filter.status = query.status;
  if (query.vehicleType) filter.vehicleType = query.vehicleType;
  if (query.purpose) filter.purpose = query.purpose;
  if (query.month) {
    const { from, to } = monthRange(query.month);
    filter.departAt = { $gte: from, $lt: to };
  }
  const search = query.search?.trim();
  if (search) {
    const expression = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ customerName: expression }, { "requester.name": expression }, { "requester.email": expression }, { pickup: expression }, { destination: expression }];
  }
  return filter;
}

/** Whole month in Vietnam time. */
export function monthRange(month: string) {
  const [year, value] = month.split("-").map(Number);
  const from = getVietnamDateTimeAsUtc(`${year}-${String(value).padStart(2, "0")}-01`, "00:00");
  const nextYear = value === 12 ? year + 1 : year;
  const nextMonth = value === 12 ? 1 : value + 1;
  const to = getVietnamDateTimeAsUtc(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`, "00:00");
  return { from, to };
}

async function loadAny(id: string) {
  ensureId(id);
  const trip = await vehicleBookingRepository.findById(id) as StoredVehicleBooking | null;
  if (!trip) throw new AppError(404, "Không tìm thấy chuyến xe.");
  return trip;
}

/** HR's side (admin portal, "vehicles:manage"). */
export const hrVehicleService = {
  async list(query: VehicleListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const filter = listFilter(query);
    const [items, total, waiting] = await Promise.all([
      vehicleBookingRepository.list(filter, (page - 1) * limit, limit),
      vehicleBookingRepository.count(filter),
      vehicleBookingRepository.count({ status: { $in: ["pending", "arrived"] } }),
    ]);
    return {
      items: (items as StoredVehicleBooking[]).map(toResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      waiting,
    };
  },

  async get(id: string) {
    return toResponse(await loadAny(id));
  },

  /** Chooses the car and/or edits the trip. A pending request becomes "arranged" once a car is chosen. */
  async arrange(admin: AuthenticatedAccount, id: string, input: VehicleArrangeInput) {
    const trip = await loadAny(id);
    if (!["pending", "arranged", "arrived"].includes(trip.status)) throw new AppError(409, "Chuyến xe đã chốt hoặc đã hủy, không sửa được nữa.");
    const { vehicleType, driverName, driverPlate, driverPhone, estimatedCost, ...tripInput } = input;
    const set: Record<string, unknown> = buildTrip(tripInput, trip, { requireLead: false });
    const type = vehicleType ?? trip.vehicleType ?? null;
    if (vehicleType !== undefined) set.vehicleType = vehicleType;
    if (type === "external") {
      const cost = estimatedCost !== undefined ? estimatedCost : trip.estimatedCost;
      if (!cost) throw fieldError("estimatedCost", "Xe ngoài cần nhập giá dự kiến.");
      if (estimatedCost !== undefined) set.estimatedCost = estimatedCost;
    }
    if (type === "company") set.estimatedCost = null;
    for (const [key, value] of Object.entries({ driverName, driverPlate, driverPhone })) if (value !== undefined) set[key] = value;
    const becomesArranged = trip.status === "pending" && Boolean(type);
    if (becomesArranged) Object.assign(set, { status: "arranged", arrangedBy: person(admin) });
    if (trip.status === "pending" && !type && Object.keys(set).length === 0) throw fieldError("vehicleType", "Vui lòng chọn loại xe.");

    const saved = await vehicleBookingRepository.updateIfStatus(id, [trip.status], { $set: set }) as StoredVehicleBooking | null;
    if (!saved) throw changedElsewhere();
    await vehicleNotifier.toRequester(saved, becomesArranged ? "vehicle-arranged" : "vehicle-updated");
    return toResponse(saved);
  },

  /** Closes the trip. HR may close it at any time; an external car needs the real price. */
  async complete(admin: AuthenticatedAccount, id: string, actualCost: number | null | undefined, uploads: UploadedReceipt[]) {
    try {
      const trip = await loadAny(id);
      if (!["arranged", "arrived"].includes(trip.status)) {
        throw new AppError(409, trip.status === "pending" ? "Vui lòng chọn loại xe trước khi chốt chuyến." : "Chuyến xe đã chốt hoặc đã hủy.");
      }
      if (trip.vehicleType === "external" && !actualCost) throw fieldError("actualCost", "Xe ngoài cần nhập giá thật trước khi chốt.");
      if ((trip.receipts?.length ?? 0) + uploads.length > MAX_RECEIPTS) throw new AppError(400, `Mỗi chuyến tối đa ${MAX_RECEIPTS} ảnh.`);
      const update: UpdateQuery<VehicleBooking> = {
        $set: { status: "completed", completedAt: new Date(), completedBy: person(admin), actualCost: trip.vehicleType === "external" ? actualCost : null },
        $push: { receipts: { $each: receiptsFrom(uploads, "hr") } },
      };
      const saved = await vehicleBookingRepository.updateIfStatus(id, [trip.status], update) as StoredVehicleBooking | null;
      if (!saved) throw changedElsewhere();
      await vehicleNotifier.toRequester(saved, "vehicle-completed");
      return toResponse(saved);
    } catch (error) {
      await removeVehicleReceiptFiles(uploads.map((upload) => upload.publicId));
      throw error;
    }
  },

  async cancel(admin: AuthenticatedAccount, id: string, reason: string) {
    const trip = await loadAny(id);
    if (!["pending", "arranged", "arrived"].includes(trip.status)) throw new AppError(409, "Chuyến xe đã chốt hoặc đã hủy.");
    const saved = await vehicleBookingRepository.updateIfStatus(id, [trip.status], {
      $set: { status: "cancelled", cancel: { by: person(admin), byRequester: false, reason: reason.trim(), at: new Date() } },
    }) as StoredVehicleBooking | null;
    if (!saved) throw changedElsewhere();
    await vehicleNotifier.toRequester(saved, "vehicle-cancelled");
    return toResponse(saved);
  },

  /** Separate right ("vehicles:delete"): only cancelled trips, completed ones stay for the reports. */
  async remove(id: string) {
    ensureId(id);
    const deleted = await vehicleBookingRepository.deleteCancelled(id) as StoredVehicleBooking | null;
    if (!deleted) throw new AppError(409, "Chỉ xóa được chuyến xe đã hủy.");
    await removeVehicleReceiptFiles((deleted.receipts ?? []).map((receipt) => receipt.publicId));
    return { id };
  },

  async report(month: string) {
    const { from, to } = monthRange(month);
    const trips = await vehicleBookingRepository.findForReport(from, to) as StoredVehicleBooking[];
    const completed = trips.filter((trip) => trip.status === "completed");
    const external = completed.filter((trip) => trip.vehicleType === "external");
    const sumBy = (key: (trip: StoredVehicleBooking) => string) => {
      const map = new Map<string, { trips: number; cost: number }>();
      for (const trip of external) {
        const entry = map.get(key(trip)) ?? { trips: 0, cost: 0 };
        entry.trips += 1; entry.cost += trip.actualCost ?? 0;
        map.set(key(trip), entry);
      }
      return [...map.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.cost - a.cost);
    };
    return {
      month,
      totals: {
        trips: trips.length,
        completed: completed.length,
        cancelled: trips.filter((trip) => trip.status === "cancelled").length,
        companyTrips: completed.filter((trip) => trip.vehicleType === "company").length,
        externalTrips: external.length,
        externalCost: external.reduce((sum, trip) => sum + (trip.actualCost ?? 0), 0),
        // Not closed yet: their real cost is still missing from the total.
        notClosed: trips.filter((trip) => ["pending", "arranged", "arrived"].includes(trip.status)).length,
      },
      byDepartment: sumBy((trip) => trip.requester.department || "Chưa có phòng ban"),
      byPurpose: sumBy((trip) => trip.purpose),
      trips: trips.map(toResponse),
    };
  },
};
