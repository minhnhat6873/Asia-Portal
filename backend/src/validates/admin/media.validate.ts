import Joi from "joi";

import { MEDIA_AUTHOR_DEPARTMENTS, MEDIA_CATEGORIES, MEDIA_STATUSES } from "../../interfaces/media.interface";
import { isMediaExpiryAfterPublication, MEDIA_EXPIRY_DATE_ERROR } from "../../utils/media/validateMediaDates";

const mediaFields = {
  title: Joi.string().trim().min(5).max(200),
  category: Joi.string().valid(...MEDIA_CATEGORIES),
  summary: Joi.string().trim().min(1).max(2000),
  content: Joi.string().allow("").max(50000),
  coverImage: Joi.string().trim().allow("").max(500),
  authorDepartment: Joi.string().trim().valid(...MEDIA_AUTHOR_DEPARTMENTS).messages({
    "any.only": "Đơn vị đăng bài chỉ được là phòng Thiết kế, Marketing & Truyền thông hoặc Nhân sự & Hành chính.",
  }),
  publishDate: Joi.date().iso(),
  expiryDate: Joi.date().iso().allow(null).custom((value: Date | null) => value ? new Date(value.toISOString().slice(0, 10)) : null).messages({
    "any.required": "Vui lòng chọn ngày hết hạn.",
    "any.invalid": "Vui lòng chọn ngày hết hạn.",
    "date.base": "Vui lòng chọn ngày hết hạn hợp lệ.",
    "date.format": "Vui lòng chọn ngày hết hạn hợp lệ.",
  }),
  publishIndefinitely: Joi.boolean(),
  status: Joi.string().valid(...MEDIA_STATUSES),
};

export const createMediaSchema = Joi.object({
  title: mediaFields.title.required(),
  category: mediaFields.category.required(),
  summary: mediaFields.summary.required(),
  content: mediaFields.content.default(""),
  coverImage: mediaFields.coverImage.default(""),
  authorDepartment: mediaFields.authorDepartment.required(),
  publishDate: mediaFields.publishDate.required(),
  expiryDate: mediaFields.expiryDate.when("publishIndefinitely", {
    is: true,
    then: Joi.optional().allow(null).default(null),
    otherwise: Joi.required().invalid(null),
  }),
  publishIndefinitely: mediaFields.publishIndefinitely.default(false),
  status: mediaFields.status.default("draft"),
}).custom((value, helpers) => {
  if (!value.publishIndefinitely && !isMediaExpiryAfterPublication(value.publishDate, value.expiryDate)) {
    return helpers.message({ custom: MEDIA_EXPIRY_DATE_ERROR });
  }
  return value;
}).messages({
  "any.required": "{#label} là bắt buộc",
  "string.empty": "{#label} không được để trống",
});

export const updateMediaSchema = Joi.object(mediaFields).min(1).custom((value, helpers) => {
  if (value.publishIndefinitely !== true && value.publishDate && !isMediaExpiryAfterPublication(value.publishDate, value.expiryDate)) {
    return helpers.message({ custom: MEDIA_EXPIRY_DATE_ERROR });
  }
  return value;
}).messages({
  "object.min": "Cần cung cấp ít nhất một trường để cập nhật",
});

export const mediaListQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").max(200),
  category: mediaFields.category,
  status: mediaFields.status,
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  sort: Joi.string().valid("latest", "oldest"),
});

export const mediaTrashActionSchema = Joi.object({}).unknown(false).default({});
