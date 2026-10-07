import { model, models, Schema } from "mongoose";

import { AUDIT_ACTIONS, type AuditLog } from "../interfaces/audit-log.interface";

const auditLogSchema = new Schema<AuditLog>(
  {
    actor: {
      accountId: { type: String, required: true, trim: true },
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      _id: false,
    },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    entityType: { type: String, enum: ["employee"], required: true, index: true },
    entityId: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed, default: undefined },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

auditLogSchema.index({ createdAt: -1 });

const AuditLogModel = models.AuditLog || model<AuditLog>("AuditLog", auditLogSchema);

export default AuditLogModel;
