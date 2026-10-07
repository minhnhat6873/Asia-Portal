import type { QueryFilter } from "mongoose";

import type { AuditLog } from "../../interfaces/audit-log.interface";
import AuditLogModel from "../../models/audit-log.model";

export const auditLogRepository = {
  create(data: AuditLog) {
    return AuditLogModel.create(data);
  },

  findAll(filter: QueryFilter<AuditLog>, skip: number, limit: number) {
    return AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  },

  count(filter: QueryFilter<AuditLog>) {
    return AuditLogModel.countDocuments(filter);
  },
};
