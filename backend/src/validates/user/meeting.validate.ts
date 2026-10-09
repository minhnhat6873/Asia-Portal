import Joi from "joi";

import { MEETING_ROOMS, MEETING_TIME_OPTIONS } from "../../config/meeting.config";

const roomIds = MEETING_ROOMS.map(({ id }) => id);
const objectIdSchema = Joi.string().hex().length(24).messages({
  "string.hex": "Mã yêu cầu không hợp lệ.",
  "string.length": "Mã yêu cầu không hợp lệ.",
});

const dateSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value: string, helpers) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return helpers.error("date.invalid");
    }
    return value;
  })
  .messages({
    "string.pattern.base": "Ngày phải theo định dạng YYYY-MM-DD.",
    "date.invalid": "Ngày không hợp lệ.",
    "any.required": "Ngày họp là bắt buộc.",
  });

export const createMeetingBookingSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required().messages({
    "string.empty": "Tiêu đề cuộc họp là bắt buộc.",
    "string.min": "Tiêu đề cuộc họp phải có ít nhất 3 ký tự.",
    "string.max": "Tiêu đề cuộc họp không được vượt quá 200 ký tự.",
    "any.required": "Tiêu đề cuộc họp là bắt buộc.",
  }),
  organizer: Joi.string().trim().min(2).max(100).pattern(/^[\p{L}\p{M}\s]+$/u).required().messages({
    "string.empty": "Tên người chủ trì là bắt buộc.",
    "string.min": "Tên người chủ trì phải có ít nhất 2 ký tự.",
    "string.max": "Tên người chủ trì không được vượt quá 100 ký tự.",
    "string.pattern.base": "Tên người chủ trì chỉ được chứa chữ cái và khoảng trắng.",
    "any.required": "Tên người chủ trì là bắt buộc.",
  }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(150)
    .pattern(/^[a-z0-9._%+-]+@asiafnb\.com$/)
    .required()
    .messages({
      "string.email": "Email không hợp lệ.",
      "string.max": "Email không được vượt quá 150 ký tự.",
      "string.pattern.base": "Email phải có đuôi @asiafnb.com.",
      "any.required": "Email là bắt buộc.",
    }),
  department: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Phòng ban là bắt buộc.",
    "string.min": "Phòng ban phải có ít nhất 2 ký tự.",
    "string.max": "Phòng ban không được vượt quá 100 ký tự.",
    "any.required": "Phòng ban là bắt buộc.",
  }),
  roomId: Joi.string().valid(...roomIds).required().messages({
    "any.only": "Phòng họp không hợp lệ.",
    "any.required": "Phòng họp là bắt buộc.",
  }),
  attendees: Joi.number().integer().min(1).required().messages({
    "number.base": "Số người tham dự phải là số nguyên.",
    "number.integer": "Số người tham dự phải là số nguyên.",
    "number.min": "Số người tham dự phải ít nhất là 1.",
    "any.required": "Số người tham dự là bắt buộc.",
  }),
  date: dateSchema.required(),
  start: Joi.string().valid(...MEETING_TIME_OPTIONS).required().messages({
    "any.only": "Giờ bắt đầu không hợp lệ.",
    "any.required": "Giờ bắt đầu là bắt buộc.",
  }),
  durationMinutes: Joi.number()
    .integer()
    .min(30)
    .custom((value: number, helpers) =>
      (value - 30) % 15 === 0 ? value : helpers.error("duration.step"),
    )
    .required()
    .messages({
      "number.base": "Thời lượng họp phải là số nguyên.",
      "number.integer": "Thời lượng họp phải là số nguyên.",
      "number.min": "Thời lượng họp tối thiểu là 30 phút.",
      "duration.step": "Thời lượng họp phải tăng theo bước 15 phút.",
      "any.required": "Thời lượng họp là bắt buộc.",
    }),
});

export const verifyMeetingBookingOtpSchema = Joi.object({
  requestId: objectIdSchema.required().messages({ "any.required": "Mã yêu cầu là bắt buộc." }),
  code: Joi.string().pattern(/^\d{6}$/).required().messages({
    "string.pattern.base": "Mã OTP phải gồm đúng 6 chữ số.",
    "any.required": "Mã OTP là bắt buộc.",
  }),
});

export const startMeetingCancellationSchema = Joi.object({
  bookingId: objectIdSchema.required().messages({ "any.required": "Mã lịch đặt là bắt buộc." }),
});

export const verifyMeetingCancellationOtpSchema = Joi.object({
  bookingId: objectIdSchema.required().messages({ "any.required": "Mã lịch đặt là bắt buộc." }),
  code: Joi.string().pattern(/^\d{6}$/).required().messages({
    "string.pattern.base": "Mã OTP phải gồm đúng 6 chữ số.",
    "any.required": "Mã OTP là bắt buộc.",
  }),
});

export const resendMeetingBookingOtpSchema = Joi.object({
  requestId: objectIdSchema.required().messages({ "any.required": "Mã yêu cầu là bắt buộc." }),
});

export const resendMeetingCancellationOtpSchema = Joi.object({
  bookingId: objectIdSchema.required().messages({ "any.required": "Mã lịch đặt là bắt buộc." }),
});

export const meetingBookingListQuerySchema = Joi.object({
  dateFrom: dateSchema,
  dateTo: dateSchema,
  roomId: Joi.string().valid(...roomIds).messages({ "any.only": "Phòng họp không hợp lệ." }),
  department: Joi.string().trim().min(2).max(100).messages({
    "string.min": "Phòng ban phải có ít nhất 2 ký tự.",
    "string.max": "Phòng ban không được vượt quá 100 ký tự.",
  }),
  search: Joi.string().trim().allow("").max(100).messages({
    "string.max": "Từ khóa tìm kiếm không được vượt quá 100 ký tự.",
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.integer": "Số trang phải là số nguyên.",
    "number.min": "Số trang phải từ 1 trở lên.",
  }),
  limit: Joi.number().integer().min(1).max(500).default(100).messages({
    "number.integer": "Số bản ghi mỗi trang phải là số nguyên.",
    "number.min": "Số bản ghi mỗi trang tối thiểu là 1.",
    "number.max": "Số bản ghi mỗi trang tối đa là 500.",
  }),
});
