import mongoose, { type QueryFilter, type UpdateQuery } from "mongoose";

import type { AuthenticatedAccount } from "../../interfaces/account.interface";
import type {
  StoredVehicleBooking,
  VehicleArrangeInput,
  VehicleBooking,
  VehicleChange,
  VehicleListQuery,
  VehiclePerson,
  VehicleReceipt,
  VehicleRequestInput,
} from "../../interfaces/vehicle-booking.interface";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";
import { vehicleBookingRepository } from "../../repositories/vehicle-booking.repository";
import { AppError } from "../../utils/errors/AppError";
import { vietnameseSearchRegex } from "../../utils/text/vietnameseSearchRegex";
import { getVietnamDateTimeAsUtc } from "../../utils/time/vietnamTime";
import { removeVehicleReceiptFiles } from "../../utils/vehicle/receipts";
import { formatVietnamTime, vehicleNotifier } from "./vehicle-notifier";

/** Requests must be sent at least this long before departure, so HR can arrange a car. */
export const VEHICLE_MIN_LEAD_MINUTES = 15;
/** Departure at most this many days ahead (catches typos such as year 2062). */
export const VEHICLE_MAX_DAYS_AHEAD = 90;
/** A round trip comes back within this many days. */
export const VEHICLE_MAX_TRIP_DAYS = 30;
/**
 * TẠM ĐỂ TEST: true cho phép chốt chuyến với giờ hoàn thành thật ở tương lai.
 * Test xong đổi về false (và VEHICLE_ALLOW_FUTURE_END trong VehicleTripDialog.tsx).
 */
export const VEHICLE_ALLOW_FUTURE_END = true;
const DAY_MS = 24 * 60 * 60_000;
const placeKey = (text: string) => text.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
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
  for (const key of ["forOther", "forOtherName", "forOtherPhone", "purpose", "customerName", "customerPhone", "goodsDescription", "goodsQuantity", "senderName", "senderPhone", "receiverName", "receiverPhone", "pickup", "destination", "note", "roundTrip"] as const) {
    if (has(key)) (next as Record<string, unknown>)[key] = input[key];
  }
  if (has("passengerCount")) next.passengerCount = input.passengerCount ?? null;
  if (has("pickupLocation")) next.pickupLocation = input.pickupLocation ?? null;
  if (has("departAt")) next.departAt = parseLocal(input.departAt!);
  if (has("expectedEndAt")) next.expectedEndAt = parseLocal(input.expectedEndAt!);
  if (has("returnAt")) next.returnAt = input.returnAt ? parseLocal(input.returnAt) : null;

  const merged = { ...current, ...next };
  if (!merged.roundTrip) next.returnAt = null;
  // Booked for someone else: HR needs that person's name and phone to reach them.
  if (merged.forOther) {
    if (!merged.forOtherName?.trim()) throw fieldError("forOtherName", "Vui lòng nhập họ tên người được đặt giúp.");
    if (!merged.forOtherPhone?.trim()) throw fieldError("forOtherPhone", "Vui lòng nhập số điện thoại người được đặt giúp.");
  } else if (has("forOther")) Object.assign(next, { forOtherName: "", forOtherPhone: "" });
  const purpose = merged.purpose;
  if (purpose === "guest") {
    if (!merged.customerName?.trim()) throw fieldError("customerName", "Vui lòng nhập tên khách hoặc công ty.");
    if (!merged.passengerCount) throw fieldError("passengerCount", "Vui lòng nhập số người.");
    if (has("purpose")) Object.assign(next, { goodsDescription: "", goodsQuantity: "", senderName: "", senderPhone: "", receiverName: "", receiverPhone: "" });
  }
  if (purpose === "delivery") {
    const required: [keyof VehicleBooking, string][] = [
      ["senderName", "Vui lòng nhập tên người gửi."], ["senderPhone", "Vui lòng nhập số điện thoại người gửi."],
      ["receiverName", "Vui lòng nhập tên người nhận."], ["receiverPhone", "Vui lòng nhập số điện thoại người nhận."],
      ["goodsDescription", "Vui lòng mô tả hàng hóa."],
      ["goodsQuantity", "Vui lòng nhập số lượng / khối lượng hàng."],
    ];
    for (const [field, message] of required) if (!String(merged[field] ?? "").trim()) throw fieldError(field, message);
    // Phones arrive normalised ("0901234567"), so the same number written differently still matches.
    if (merged.senderPhone === merged.receiverPhone) throw fieldError("receiverPhone", "Số điện thoại người nhận phải khác người gửi.");
    // Lists and reports show the two sides as the "customer".
    next.customerName = `${String(merged.senderName).trim()} → ${String(merged.receiverName).trim()}`;
    next.customerPhone = "";
    next.passengerCount = null;
  }

  if (merged.pickup && merged.destination && placeKey(merged.pickup) === placeKey(merged.destination)) {
    throw fieldError("destination", "Điểm đến phải khác điểm đón.");
  }

  const departAt = merged.departAt!;
  if (options.requireLead && (has("departAt") || !current) && departAt.getTime() < Date.now() + VEHICLE_MIN_LEAD_MINUTES * 60_000) {
    throw fieldError("departAt", `Vui lòng đặt xe trước giờ đi ít nhất ${VEHICLE_MIN_LEAD_MINUTES} phút.`);
  }
  if ((has("departAt") || !current) && departAt.getTime() > Date.now() + VEHICLE_MAX_DAYS_AHEAD * DAY_MS) {
    throw fieldError("departAt", `Chỉ đặt xe trước tối đa ${VEHICLE_MAX_DAYS_AHEAD} ngày.`);
  }
  const returnAt = merged.roundTrip ? (next.returnAt !== undefined ? next.returnAt : merged.returnAt) : null;
  if (merged.roundTrip && !returnAt) throw fieldError("returnAt", "Vui lòng chọn giờ về.");
  if (returnAt && returnAt <= departAt) throw fieldError("returnAt", "Giờ về phải sau giờ đi.");
  if (returnAt && returnAt.getTime() - departAt.getTime() > VEHICLE_MAX_TRIP_DAYS * DAY_MS) throw fieldError("returnAt", `Giờ về cách giờ đi tối đa ${VEHICLE_MAX_TRIP_DAYS} ngày.`);
  const expectedEndAt = merged.expectedEndAt ?? null;
  if (expectedEndAt && expectedEndAt <= departAt) throw fieldError("expectedEndAt", "Thời gian hoàn thành dự kiến phải sau giờ đi.");
  if (expectedEndAt && returnAt && expectedEndAt < returnAt) throw fieldError("expectedEndAt", "Thời gian hoàn thành dự kiến không được trước giờ về.");
  // A changed time starts the reminders again.
  if (has("departAt")) (next as Record<string, unknown>).departReminderSentAt = null;
  if (has("expectedEndAt")) Object.assign(next, { hrOverdueNotifiedAt: null, hrOverdueEmailedAt: null });
  return next;
}

function toResponse(trip: StoredVehicleBooking) {
  return {
    id: String(trip._id),
    requester: trip.requester,
    forOther: trip.forOther === true,
    forOtherName: trip.forOtherName ?? "",
    forOtherPhone: trip.forOtherPhone ?? "",
    purpose: trip.purpose,
    customerName: trip.customerName,
    customerPhone: trip.customerPhone ?? "",
    passengerCount: trip.passengerCount ?? null,
    goodsDescription: trip.goodsDescription ?? "",
    goodsQuantity: trip.goodsQuantity ?? "",
    senderName: trip.senderName ?? "",
    senderPhone: trip.senderPhone ?? "",
    receiverName: trip.receiverName ?? "",
    receiverPhone: trip.receiverPhone ?? "",
    pickup: trip.pickup,
    pickupLocation: trip.pickupLocation?.lat != null ? { lat: trip.pickupLocation.lat, lng: trip.pickupLocation.lng, accuracy: trip.pickupLocation.accuracy ?? null } : null,
    destination: trip.destination,
    departAt: trip.departAt,
    roundTrip: trip.roundTrip,
    returnAt: trip.returnAt ?? null,
    expectedEndAt: trip.expectedEndAt ?? null,
    note: trip.note ?? "",
    status: trip.status,
    vehicleType: trip.vehicleType ?? null,
    driverName: trip.driverName ?? "",
    driverPlate: trip.driverPlate ?? "",
    driverPhone: trip.driverPhone ?? "",
    estimatedCost: trip.estimatedCost ?? null,
    actualCost: trip.actualCost ?? null,
    receipts: (trip.receipts ?? []).map(({ url, uploadedBy, at }) => ({ url, uploadedBy, at })),
    changes: (trip.changes ?? []).map((change) => ({ at: change.at, byName: change.by?.name ?? "", reason: change.reason, items: change.items })),
    arrangedBy: trip.arrangedBy ? { name: trip.arrangedBy.name } : null,
    arrivedAt: trip.arrivedAt ?? null,
    actualEndAt: trip.actualEndAt ?? null,
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

/** What HR changed compared with the stored trip (only what the requester asked for). */
function describeChange(trip: StoredVehicleBooking, set: Record<string, unknown>): VehicleChange["items"] {
  const items: VehicleChange["items"] = [];
  const time = (value: unknown) => (value instanceof Date ? formatVietnamTime(value) : "—");
  for (const [key, label] of [["departAt", "Giờ đi"], ["returnAt", "Giờ về"]] as const) {
    if (!(key in set)) continue;
    const before = trip[key] ? new Date(trip[key]!).getTime() : null;
    const after = set[key] instanceof Date ? (set[key] as Date).getTime() : null;
    if (before !== after) items.push({ label, from: time(trip[key] ? new Date(trip[key]!) : null), to: time(set[key]) });
  }
  for (const [key, label] of [["pickup", "Điểm đón"], ["destination", "Điểm đến"]] as const) {
    if (key in set && String(set[key]).trim() !== trip[key].trim()) items.push({ label, from: trip[key], to: String(set[key]) });
  }
  return items;
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
    // Not awaited: the requester does not wait for the mail server.
    void vehicleNotifier.emailHrNew(created);
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
    const expression = vietnameseSearchRegex(search);
    filter.$or = [{ customerName: expression }, { "requester.name": expression }, { "requester.email": expression }, { forOtherName: expression }, { pickup: expression }, { destination: expression }];
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
    // The requester's note stays theirs; HR explains changes with changeReason instead.
    const { vehicleType, driverName, driverPlate, driverPhone, estimatedCost, changeReason, note: _requesterNote, ...tripInput } = input;
    const set: Record<string, unknown> = buildTrip(tripInput, trip, { requireLead: false });
    // Changing what the requester asked for (time or route) needs a reason, which is sent to
    // them. Without such a change, a reason typed anyway is kept and sent as a note from HR
    // (never dropped silently).
    const change = describeChange(trip, set);
    const reasonText = (changeReason ?? "").trim();
    if (change.length && reasonText.length < 3) {
      throw fieldError("changeReason", "Vui lòng nhập lý do thay đổi (ít nhất 3 ký tự) để báo cho người đặt.");
    }
    if (reasonText && reasonText.length < 3) throw fieldError("changeReason", "Lời nhắn cho người đặt cần ít nhất 3 ký tự.");
    const changeEntry: VehicleChange | null = change.length || reasonText ? { at: new Date(), by: person(admin), reason: reasonText, items: change } : null;
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
    // HR sets the expected end together with the car; reminders count from it.
    if (type && !(set.expectedEndAt ?? trip.expectedEndAt)) throw fieldError("expectedEndAt", "Vui lòng nhập thời gian hoàn thành dự kiến.");
    if (becomesArranged) Object.assign(set, { status: "arranged", arrangedBy: person(admin) });
    if (trip.status === "pending" && !type && Object.keys(set).length === 0) throw fieldError("vehicleType", "Vui lòng chọn loại xe.");

    const update: UpdateQuery<VehicleBooking> = changeEntry ? { $set: set, $push: { changes: changeEntry } } : { $set: set };
    const saved = await vehicleBookingRepository.updateIfStatus(id, [trip.status], update) as StoredVehicleBooking | null;
    if (!saved) throw changedElsewhere();
    await vehicleNotifier.toRequester(saved, becomesArranged ? "vehicle-arranged" : "vehicle-updated", changeEntry);
    // A changed time or place matters before departure: email as well, not only the web bell.
    if (changeEntry) await vehicleNotifier.emailRequesterChange(saved, changeEntry);
    return toResponse(saved);
  },

  /**
   * Closes the trip with what really happened: when it ended (required) and, for an
   * external car, the real price. HR may close it at any time after departure.
   */
  async complete(admin: AuthenticatedAccount, id: string, result: { actualCost?: number | null; actualEndAt: string }, uploads: UploadedReceipt[]) {
    const { actualCost } = result;
    try {
      const trip = await loadAny(id);
      if (!["arranged", "arrived"].includes(trip.status)) {
        throw new AppError(409, trip.status === "pending" ? "Vui lòng chọn loại xe trước khi chốt chuyến." : "Chuyến xe đã chốt hoặc đã hủy.");
      }
      if (trip.vehicleType === "external" && !actualCost) throw fieldError("actualCost", "Xe ngoài cần nhập giá thật trước khi chốt.");
      if (!result.actualEndAt) throw fieldError("actualEndAt", "Vui lòng chọn thời gian hoàn thành thật.");
      const actualEndAt = parseLocal(result.actualEndAt);
      if (actualEndAt <= trip.departAt) throw fieldError("actualEndAt", "Thời gian hoàn thành thật phải sau giờ đi.");
      // A minute of slack for clocks; the trip cannot have ended in the future.
      if (!VEHICLE_ALLOW_FUTURE_END && actualEndAt.getTime() > Date.now() + 60_000) throw fieldError("actualEndAt", "Thời gian hoàn thành thật không được ở tương lai.");
      if ((trip.receipts?.length ?? 0) + uploads.length > MAX_RECEIPTS) throw new AppError(400, `Mỗi chuyến tối đa ${MAX_RECEIPTS} ảnh.`);
      const update: UpdateQuery<VehicleBooking> = {
        $set: { status: "completed", actualEndAt, completedAt: new Date(), completedBy: person(admin), actualCost: trip.vehicleType === "external" ? actualCost : null },
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
