import Joi from "joi";
export const feedbackQuerySchema = Joi.object({ page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(50), q: Joi.string().trim().max(200).allow(""), status: Joi.string().valid("all", "pending", "seen") });
export const feedbackPatchSchema = Joi.object({ status: Joi.string().valid("pending", "seen"), pinned: Joi.boolean().strict() }).min(1).messages({ "object.min": "Vui lòng chọn ít nhất một trường cần cập nhật." });
