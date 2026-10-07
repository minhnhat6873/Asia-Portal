import type { NextFunction, Request, Response } from "express";

import type { AuditLogListQuery } from "../../interfaces/audit-log.interface";
import { auditLogService } from "../../services/admin/audit-log.service";

export async function getAuditLogs(
  request: Request<unknown, unknown, unknown, AuditLogListQuery>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await auditLogService.getAuditLogs(request.query);
    response.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
