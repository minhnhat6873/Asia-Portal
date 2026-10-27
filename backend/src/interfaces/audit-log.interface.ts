export const AUDIT_ACTIONS = [
  "permission_group.deleted",
  "account.deleted",
  "meeting.created",
  "meeting.updated",
  "meeting.deleted",
  "meeting.pending_revoked",
  "meeting.cancel_request_revoked",
  "employee.created",
  "employee.updated",
  "employee.soft_deleted",
  "employee.restored",
  "employee.permanently_deleted",
  "media.created",
  "media.updated",
  "media.soft_deleted",
  "media.restored",
  "media.permanently_deleted",
  "site_settings.updated",
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
  entityType: "employee" | "media" | "meeting" | "account" | "permission_group" | "site_settings";
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
