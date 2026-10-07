import type { QueryFilter } from "mongoose";

import type { AuditLog, AuditLogListQuery } from "../../interfaces/audit-log.interface";
import { auditLogRepository } from "../../repositories/admin/audit-log.repository";

export const auditLogService = {
  async record(data: AuditLog): Promise<void> {
    try {
      await auditLogRepository.create(data);
    } catch (error) {
      console.error("Không thể ghi nhật ký quản trị", error);
    }
  },

  async getAuditLogs(query: AuditLogListQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const filter: QueryFilter<AuditLog> = {};
    if (query.action) filter.action = query.action;

    const [items, total] = await Promise.all([
      auditLogRepository.findAll(filter, (page - 1) * limit, limit),
      auditLogRepository.count(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
};
