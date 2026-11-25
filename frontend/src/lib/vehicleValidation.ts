import type { VehicleRequestInput } from "@/services/vehicle.service";

/**
 * Checks for the vehicle request form. The server applies the same rules
 * (backend/src/validates/vehicle-booking.validate.ts and vehicle-booking.service.ts),
 * so mistakes show before sending. Times are Vietnam local "YYYY-MM-DDTHH:mm".
 */
export const VEHICLE_MIN_LEAD_MINUTES = 15;
/** Departure at most this many days ahead (catches typos such as year 2062). */
export const VEHICLE_MAX_DAYS_AHEAD = 90;
/** A round trip comes back within this many days. */
export const VEHICLE_MAX_TRIP_DAYS = 30;

export type VehicleRequestErrors = Partial<Record<keyof VehicleRequestInput, string>>;

const COMPLETE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Vietnam is UTC+7 all year (no daylight saving). */
const localToMs = (value: string) => Date.parse(`${value}:00+07:00`);

/** Vietnam local "YYYY-MM-DDTHH:mm" for a moment. */
export function vietnamLocal(ms: number): string {
  return new Date(ms + 7 * 60 * 60_000).toISOString().slice(0, 16);
}

/**
 * Vietnamese phone numbers (same rules as backend/src/utils/text/vietnamPhone.ts).
 *
 * - Mobile: 10 digits, 0 + a carrier prefix in use:
 *   Viettel 032–039, 086, 096–098 · Vinaphone 081–085, 088, 091, 094 ·
 *   Mobifone 070, 076–079, 089, 090, 093 · Vietnamobile 052, 056, 058, 092 ·
 *   Gmobile 059, 099 · Itelecom 087 · Reddi 055.
 * - Landline: 11 digits starting with 02 (area codes since 2017, e.g. 028 3812 3456).
 * - "+84" / "84" is accepted instead of the leading 0; spaces, dots, dashes and
 *   brackets may separate the digits.
 */
export const VIETNAM_MOBILE_PREFIXES: ReadonlySet<string> = new Set([
  "032", "033", "034", "035", "036", "037", "038", "039",
  "052", "055", "056", "058", "059",
  "070", "076", "077", "078", "079",
  "081", "082", "083", "084", "085", "086", "087", "088", "089",
  "090", "091", "092", "093", "094", "096", "097", "098", "099",
]);

/** One message for every wrong number (wrong length, prefix, letters, foreign number…). */
export const VIETNAM_PHONE_INVALID = "Số điện thoại không hợp lệ.";

/** The plain local number ("0901234567"), or null when it is not a Vietnamese phone number. */
export function normalizeVietnamPhone(value: string): string | null {
  const text = value.trim();
  if (!/^\+?[\d\s.()-]+$/.test(text) || !/\d/.test(text)) return null;
  const compact = text.replace(/[\s.()-]/g, "");
  const hasPlus = compact.startsWith("+");
  let digits = hasPlus ? compact.slice(1) : compact;
  if (hasPlus && !digits.startsWith("84")) return null;
  // Country code: "+84 901…", "84901…", also the common "+84 0901…".
  if (digits.startsWith("84")) digits = `0${digits.slice(2).replace(/^0/, "")}`;
  if (!digits.startsWith("0")) return null;
  if (digits.startsWith("02")) return digits.length === 11 ? digits : null;
  return digits.length === 10 && VIETNAM_MOBILE_PREFIXES.has(digits.slice(0, 3)) ? digits : null;
}

export const isValidPhone = (value: string) => normalizeVietnamPhone(value) !== null;

/** A person or company name: at least 2 characters and some letters (not only digits or symbols). */
function nameError(value: string, missing: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return missing;
  if (trimmed.length < 2 || !/\p{L}/u.test(trimmed)) return "Tên cần ít nhất 2 ký tự và có chữ cái.";
  return undefined;
}

function phoneError(value: string, missing?: string): string | undefined {
  if (!value.trim()) return missing;
  return isValidPhone(value) ? undefined : VIETNAM_PHONE_INVALID;
}

const samePlace = (a: string, b: string) => {
  const clean = (text: string) => text.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
  return clean(a) !== "" && clean(a) === clean(b);
};

export function validateVehicleRequest(values: VehicleRequestInput, now = Date.now()): VehicleRequestErrors {
  const errors: VehicleRequestErrors = {};
  const put = (field: keyof VehicleRequestInput, message: string | undefined) => { if (message) errors[field] = message; };

  if (values.forOther) {
    put("forOtherName", nameError(values.forOtherName, "Vui lòng nhập họ tên người được đặt giúp."));
    put("forOtherPhone", phoneError(values.forOtherPhone, "Vui lòng nhập số điện thoại người được đặt giúp."));
  }

  if (values.purpose === "guest") {
    put("customerName", nameError(values.customerName, "Vui lòng nhập tên khách hoặc công ty."));
    put("customerPhone", phoneError(values.customerPhone));
    if (values.passengerCount === null || values.passengerCount === undefined) errors.passengerCount = "Vui lòng nhập số người.";
    else if (!Number.isInteger(values.passengerCount) || values.passengerCount < 1 || values.passengerCount > 50) errors.passengerCount = "Số người từ 1 đến 50.";
  } else {
    // Deliveries: name and phone of both sides, what the goods are and how much.
    put("senderName", nameError(values.senderName, "Vui lòng nhập tên người gửi."));
    put("senderPhone", phoneError(values.senderPhone, "Vui lòng nhập số điện thoại người gửi."));
    put("receiverName", nameError(values.receiverName, "Vui lòng nhập tên người nhận."));
    put("receiverPhone", phoneError(values.receiverPhone, "Vui lòng nhập số điện thoại người nhận."));
    const sender = normalizeVietnamPhone(values.senderPhone);
    if (!errors.receiverPhone && sender && sender === normalizeVietnamPhone(values.receiverPhone)) errors.receiverPhone = "Số điện thoại người nhận phải khác người gửi.";
    const goods = values.goodsDescription.trim();
    if (!goods) errors.goodsDescription = "Vui lòng mô tả hàng hóa.";
    else if (goods.length < 2) errors.goodsDescription = "Mô tả hàng hóa cần ít nhất 2 ký tự.";
    const quantity = values.goodsQuantity.trim();
    if (!quantity) errors.goodsQuantity = "Vui lòng nhập số lượng / khối lượng hàng.";
    else if (!/\d/.test(quantity)) errors.goodsQuantity = "Vui lòng ghi rõ con số, ví dụ: 15 thùng, 500 kg.";
  }

  const pickup = values.pickup.trim();
  const destination = values.destination.trim();
  if (!pickup) errors.pickup = "Vui lòng nhập điểm đón.";
  else if (pickup.length < 3) errors.pickup = "Điểm đón cần ít nhất 3 ký tự.";
  if (!destination) errors.destination = "Vui lòng nhập điểm đến.";
  else if (destination.length < 3) errors.destination = "Điểm đến cần ít nhất 3 ký tự.";
  else if (samePlace(pickup, destination)) errors.destination = "Điểm đến phải khác điểm đón.";

  if (!COMPLETE.test(values.departAt)) errors.departAt = values.departAt ? "Vui lòng chọn đủ ngày và giờ đi." : "Vui lòng chọn ngày và giờ đi.";
  else if (Number.isNaN(localToMs(values.departAt))) errors.departAt = "Ngày giờ đi không hợp lệ.";
  else if (values.departAt < vietnamLocal(now + VEHICLE_MIN_LEAD_MINUTES * 60_000)) errors.departAt = `Vui lòng đặt xe trước giờ đi ít nhất ${VEHICLE_MIN_LEAD_MINUTES} phút.`;
  else if (values.departAt > vietnamLocal(now + VEHICLE_MAX_DAYS_AHEAD * 24 * 60 * 60_000)) errors.departAt = `Chỉ đặt xe trước tối đa ${VEHICLE_MAX_DAYS_AHEAD} ngày.`;

  if (values.roundTrip) {
    const returnAt = values.returnAt ?? "";
    if (!COMPLETE.test(returnAt)) errors.returnAt = returnAt ? "Vui lòng chọn đủ ngày và giờ về." : "Vui lòng chọn ngày và giờ về.";
    else if (Number.isNaN(localToMs(returnAt))) errors.returnAt = "Ngày giờ về không hợp lệ.";
    else if (COMPLETE.test(values.departAt)) {
      if (returnAt <= values.departAt) errors.returnAt = "Giờ về phải sau giờ đi.";
      else if (localToMs(returnAt) - localToMs(values.departAt) > VEHICLE_MAX_TRIP_DAYS * 24 * 60 * 60_000) errors.returnAt = `Giờ về cách giờ đi tối đa ${VEHICLE_MAX_TRIP_DAYS} ngày.`;
    }
  }

  if (values.note.length > 1000) errors.note = "Ghi chú tối đa 1000 ký tự.";
  return errors;
}
