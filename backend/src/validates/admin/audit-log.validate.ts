import Joi from "joi";

import { AUDIT_ACTIONS } from "../../interfaces/audit-log.interface";

export const auditLogListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  action: Joi.string().valid(...AUDIT_ACTIONS),
});
