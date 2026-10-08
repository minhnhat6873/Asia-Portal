import Joi from "joi";

import { MEDIA_CATEGORIES, MEDIA_STATUSES } from "../../interfaces/media.interface";

const mediaFields = {
  title: Joi.string().trim().min(5).max(200),
  category: Joi.string().valid(...MEDIA_CATEGORIES),
  summary: Joi.string().trim().min(1).max(2000),
  content: Joi.string().allow("").max(50000),
  coverImage: Joi.string().trim().allow("").max(500),
  authorDepartment: Joi.string().trim().min(2).max(100),
  publishDate: Joi.date().iso(),
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
  status: mediaFields.status.default("draft"),
}).messages({
  "any.required": "{#label} là bắt buộc",
  "string.empty": "{#label} không được để trống",
});

export const updateMediaSchema = Joi.object(mediaFields).min(1).messages({
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
