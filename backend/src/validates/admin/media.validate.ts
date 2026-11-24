import Joi from "joi";

import { MEDIA_AUTHOR_DEPARTMENTS, MEDIA_CATEGORIES, MEDIA_FEATURED_LIMIT, MEDIA_STATUSES, MEDIA_VISIBILITIES } from "../../interfaces/media.interface";
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
  featured: Joi.boolean(),
  featuredSlot: Joi.number().integer().min(1).max(MEDIA_FEATURED_LIMIT).allow(null).messages({
    "number.min": `Vị trí nổi bật chỉ từ 1 đến ${MEDIA_FEATURED_LIMIT}.`,
    "number.max": `Vị trí nổi bật chỉ từ 1 đến ${MEDIA_FEATURED_LIMIT}.`,
  }),
  status: Joi.string().valid(...MEDIA_STATUSES),
  visibility: Joi.string().valid(...MEDIA_VISIBILITIES).messages({ "any.only": "Phạm vi hiển thị chỉ được là Công khai hoặc Nội bộ." }),
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
  featured: mediaFields.featured.default(false),
  featuredSlot: mediaFields.featuredSlot,
  status: mediaFields.status.default("draft"),
  visibility: mediaFields.visibility.default("internal"),
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

function multiSelectQuery(options: readonly string[]) {
  return Joi.string().max(300).custom((value: string, helpers) => {
    const values = value.split(",");
    return values.length <= options.length && new Set(values).size === values.length && values.every((item) => options.includes(item))
      ? value : helpers.error("any.invalid");
  });
}

export const mediaListQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").max(200),
  categories: multiSelectQuery(MEDIA_CATEGORIES),
  visibilities: multiSelectQuery(MEDIA_VISIBILITIES),
  category: mediaFields.category,
  status: mediaFields.status,
  visibility: mediaFields.visibility,
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  sort: Joi.string().valid("latest", "oldest"),
  featured: Joi.boolean(),
});

export const mediaTrashActionSchema = Joi.object({}).unknown(false).default({});
