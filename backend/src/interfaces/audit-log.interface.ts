export const AUDIT_ACTIONS = [
  "employee.created",
  "employee.updated",
  "employee.soft_deleted",
  "employee.restored",
  "employee.permanently_deleted",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditActor {
  accountId: string;
  name: string;
  email: string;
}

export interface AuditLog {
  actor: AuditActor;
  action: AuditAction;
  entityType: "employee";
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface AuditLogListQuery {
  page?: string;
  limit?: string;
  action?: AuditAction;
}
