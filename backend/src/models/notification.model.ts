import { model, models, Schema } from "mongoose";

import { NOTIFICATION_TYPES, type UserNotification } from "../interfaces/notification.interface";

// Notifications older than this are removed automatically.
export const NOTIFICATION_RETENTION_SECONDS = 60 * 24 * 60 * 60;

const notificationSchema = new Schema<UserNotification>(
  {
    accountId: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    link: { type: String, required: true, trim: true, maxlength: 300 },
    refId: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: "notifications" },
);

notificationSchema.index({ accountId: 1, createdAt: -1 });
notificationSchema.index({ accountId: 1, readAt: 1 });
notificationSchema.index({ accountId: 1, type: 1, refId: 1 }, { unique: true });
notificationSchema.index({ type: 1, refId: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_RETENTION_SECONDS });

const NotificationModel = models.Notification || model<UserNotification>("Notification", notificationSchema);

export default NotificationModel;
