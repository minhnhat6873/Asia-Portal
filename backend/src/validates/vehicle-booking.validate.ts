import Joi from "joi";

import { VEHICLE_PURPOSES, VEHICLE_STATUSES, VEHICLE_TYPES } from "../interfaces/vehicle-booking.interface";
import { normalizeVietnamPhone, VIETNAM_PHONE_INVALID } from "../utils/text/vietnamPhone";

// Vietnam local time from the form, e.g. "2026-11-25T09:30".
const localTime = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).messages({
  "string.pattern.base": "Thời gian không hợp lệ.",
  "string.empty": "Vui lòng chọn thời gian.",
  "any.required": "Vui lòng chọn thời gian.",
});
// Vietnamese mobile or landline (see utils/text/vietnamPhone.ts); stored as "0901234567".
const phone = Joi.string().trim().allow("").max(25).custom((value: string, helpers) => {
  if (!value) return value;
  return normalizeVietnamPhone(value) ?? helpers.error("any.invalid");
}).messages({
  "string.max": VIETNAM_PHONE_INVALID,
  "any.invalid": VIETNAM_PHONE_INVALID,
});
// A person or company name: at least 2 characters with some letters (empty is checked by the service).
const name = (label: string) => Joi.string().trim().allow("").max(150).custom((value: string, helpers) => {
  if (value && (value.length < 2 || !/\p{L}/u.test(value))) return helpers.error("any.invalid");
  return value;
}).messages({
  "string.max": `${label} tối đa 150 ký tự.`,
  "any.invalid": "Tên cần ít nhất 2 ký tự và có chữ cái.",
});
const text = (label: string, max: number) => Joi.string().trim().max(max).messages({
  "string.empty": `Vui lòng nhập ${label}.`,
  "any.required": `Vui lòng nhập ${label}.`,
  "string.max": `${label[0].toUpperCase()}${label.slice(1)} tối đa ${max} ký tự.`,
});
export const VEHICLE_MAX_COST = 100_000_000;
const money = Joi.number().integer().min(1).max(VEHICLE_MAX_COST).messages({
  "number.base": "Số tiền phải là số.",
  "number.integer": "Số tiền phải là số nguyên (VND).",
  "number.min": "Số tiền phải lớn hơn 0.",
  "number.max": "Số tiền quá lớn.",
  "any.required": "Vui lòng nhập số tiền.",
});

const tripFields = {
  // Required when forOther is true (checked by the service).
  forOther: Joi.boolean(),
  forOtherName: name("Tên người được đặt giúp"),
  forOtherPhone: phone,
  purpose: Joi.string().valid(...VEHICLE_PURPOSES).messages({ "any.only": "Mục đích chuyến xe không hợp lệ.", "any.required": "Vui lòng chọn mục đích." }),
  customerName: name("Tên khách hàng / công ty"),
  customerPhone: phone,
  passengerCount: Joi.number().integer().min(1).max(50).allow(null).messages({
    "number.base": "Số người phải là số.", "number.min": "Số người ít nhất là 1.", "number.max": "Số người tối đa 50.",
  }),
  goodsDescription: Joi.string().trim().allow("").min(2).max(500).messages({ "string.min": "Mô tả hàng hóa cần ít nhất 2 ký tự.", "string.max": "Mô tả hàng hóa tối đa 500 ký tự." }),
  // Must say how much: "15 thùng", "500 kg", "2 cont 40 feet".
  goodsQuantity: Joi.string().trim().allow("").max(200).pattern(/\d/).messages({ "string.max": "Số lượng / khối lượng hàng tối đa 200 ký tự.", "string.pattern.base": "Vui lòng ghi rõ con số, ví dụ: 15 thùng, 500 kg." }),
  // Required for deliveries (checked by the service, which knows the purpose).
  senderName: name("Tên người gửi"),
  senderPhone: phone,
  receiverName: name("Tên người nhận"),
  receiverPhone: phone,
  pickup: text("điểm đón", 300).min(3).messages({ "string.min": "Điểm đón cần ít nhất 3 ký tự." }),
  pickupLocation: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().min(0).max(100_000).allow(null),
  }).allow(null).messages({ "number.min": "Vị trí không hợp lệ.", "number.max": "Vị trí không hợp lệ.", "any.required": "Vị trí không hợp lệ.", "object.base": "Vị trí không hợp lệ." }),
  destination: text("điểm đến", 300).min(3).messages({ "string.min": "Điểm đến cần ít nhất 3 ký tự." }),
  extraDestinations: Joi.array().items(text("điểm đến", 300).min(3)).max(20),
  departAt: localTime,
  roundTrip: Joi.boolean(),
  returnAt: localTime.allow(null, ""),
  expectedEndAt: localTime,
  note: Joi.string().trim().allow("").max(1000).messages({ "string.max": "Ghi chú tối đa 1000 ký tự." }),
};

export const vehicleRequestSchema = Joi.object({
  ...tripFields,
  purpose: tripFields.purpose.required(),
  pickup: tripFields.pickup.required(),
  destination: tripFields.destination.required(),
  departAt: tripFields.departAt.required(),
  roundTrip: tripFields.roundTrip.default(false),
  // HR decides the expected end when arranging the car.
  expectedEndAt: Joi.any().strip(),
});

export const vehicleRequestUpdateSchema = Joi.object({ ...tripFields, expectedEndAt: Joi.any().strip() }).min(1).messages({ "object.min": "Không có thay đổi nào." });

export const vehicleArrangeSchema = Joi.object({
  ...tripFields,
  vehicleType: Joi.string().valid(...VEHICLE_TYPES).messages({ "any.only": "Loại xe không hợp lệ." }),
  driverName: Joi.string().trim().allow("").max(100).messages({ "string.max": "Tên tài xế tối đa 100 ký tự." }),
  driverPlate: Joi.string().trim().allow("").max(20).messages({ "string.max": "Biển số tối đa 20 ký tự." }),
  driverPhone: phone,
  estimatedCost: money.allow(null),
  changeReason: Joi.string().trim().allow("").max(300).messages({ "string.max": "Lý do thay đổi tối đa 300 ký tự." }),
}).min(1).messages({ "object.min": "Không có thay đổi nào." });

export const vehicleCancelSchema = Joi.object({
  reason: Joi.string().trim().allow("").max(300).messages({ "string.max": "Lý do tối đa 300 ký tự." }),
});
export const vehicleHrCancelSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(300).required().messages({
    "string.empty": "Vui lòng nhập lý do hủy.", "any.required": "Vui lòng nhập lý do hủy.",
    "string.min": "Lý do hủy cần ít nhất 3 ký tự.", "string.max": "Lý do tối đa 300 ký tự.",
  }),
});
// Multipart forms send numbers as text; Joi converts them.
export const vehicleCompleteSchema = Joi.object({
  actualCost: money.allow(null, ""),
  // When the trip really ended (Vietnam local time); the service checks it against the trip.
  actualEndAt: localTime.required().messages({ "any.required": "Vui lòng chọn thời gian hoàn thành thật.", "string.empty": "Vui lòng chọn thời gian hoàn thành thật." }),
});
export const vehicleArrivedSchema = Joi.object({});

export const vehicleListQuerySchema = Joi.object({
  status: Joi.string().valid(...VEHICLE_STATUSES),
  vehicleType: Joi.string().valid(...VEHICLE_TYPES),
  purpose: Joi.string().valid(...VEHICLE_PURPOSES),
  month: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).messages({ "string.pattern.base": "Tháng không hợp lệ." }),
  search: Joi.string().trim().allow("").max(100),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

export const vehicleReportQuerySchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).required().messages({ "string.pattern.base": "Tháng không hợp lệ.", "any.required": "Vui lòng chọn tháng." }),
});
