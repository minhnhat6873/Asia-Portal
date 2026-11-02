import Joi from "joi";

const accountId = Joi.string().pattern(/^[a-f\d]{24}$/i);
export const listSessionsQuerySchema = Joi.object({
  accountId,
  page: Joi.number().integer().min(1).max(100_000),
  limit: Joi.number().integer().min(1).max(100),
});
export const revokeSessionQuerySchema = Joi.object({ accountId });
export const revokeSessionsQuerySchema = Joi.object({ accountId, scope: Joi.string().valid("others", "all").required() });
