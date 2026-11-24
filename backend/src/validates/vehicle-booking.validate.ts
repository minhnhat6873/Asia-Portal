import Joi from "joi";

import { VEHICLE_PURPOSES, VEHICLE_STATUSES, VEHICLE_TYPES } from "../interfaces/vehicle-booking.interface";

// Vietnam local time from the form, e.g. "2026-11-25T09:30".
const localTime = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).messages({
  "string.pattern.base": "Thời gian không hợp lệ.",
  "string.empty": "Vui lòng chọn thời gian.",
  "any.required": "Vui lòng chọn thời gian.",
});
const phone = Joi.string().trim().allow("").max(20).pattern(/^\+?[\d\s.-]{8,20}$/).messages({
  "string.pattern.base": "Số điện thoại không hợp lệ.",
  "string.max": "Số điện thoại không hợp lệ.",
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
  purpose: Joi.string().valid(...VEHICLE_PURPOSES).messages({ "any.only": "Mục đích chuyến xe không hợp lệ.", "any.required": "Vui lòng chọn mục đích." }),
  customerName: text("tên khách hàng / công ty", 150).allow(""),
  customerPhone: phone,
  passengerCount: Joi.number().integer().min(1).max(50).allow(null).messages({
    "number.base": "Số người phải là số.", "number.min": "Số người ít nhất là 1.", "number.max": "Số người tối đa 50.",
  }),
  goodsDescription: Joi.string().trim().allow("").max(500).messages({ "string.max": "Mô tả hàng hóa tối đa 500 ký tự." }),
  // Required for deliveries (checked by the service, which knows the purpose).
  senderName: Joi.string().trim().allow("").max(150).messages({ "string.max": "Tên người gửi tối đa 150 ký tự." }),
  senderPhone: phone,
  receiverName: Joi.string().trim().allow("").max(150).messages({ "string.max": "Tên người nhận tối đa 150 ký tự." }),
  receiverPhone: phone,
  pickup: text("điểm đón", 300),
  destination: text("điểm đến", 300),
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
  expectedEndAt: tripFields.expectedEndAt.required(),
});

export const vehicleRequestUpdateSchema = Joi.object(tripFields).min(1).messages({ "object.min": "Không có thay đổi nào." });

export const vehicleArrangeSchema = Joi.object({
  ...tripFields,
  vehicleType: Joi.string().valid(...VEHICLE_TYPES).messages({ "any.only": "Loại xe không hợp lệ." }),
  driverName: Joi.string().trim().allow("").max(100).messages({ "string.max": "Tên tài xế tối đa 100 ký tự." }),
  driverPlate: Joi.string().trim().allow("").max(20).messages({ "string.max": "Biển số tối đa 20 ký tự." }),
  driverPhone: phone,
  estimatedCost: money.allow(null),
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
export const vehicleCompleteSchema = Joi.object({ actualCost: money.allow(null, "") });
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
