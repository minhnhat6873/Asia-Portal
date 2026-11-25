import mongoose from "mongoose";

import type { NotificationInput, NotificationType } from "../../interfaces/notification.interface";
import AccountModel from "../../models/account.model";
import MediaModel from "../../models/media.model";
import NotificationModel from "../../models/notification.model";
import { notificationEvents } from "../../utils/notification/notificationEvents";

function isDuplicateKeyError(error: unknown): boolean {
  const value = error as { code?: number; writeErrors?: { code?: number }[] } | null;
  return value?.code === 11000 || Boolean(value?.writeErrors?.length && value.writeErrors.every((item) => item.code === 11000));
}

export const notificationRepository = {
  async insertForAccounts(accountIds: string[], data: NotificationInput): Promise<void> {
    if (!accountIds.length) return;
    try {
      // ordered:false keeps inserting after a duplicate (already notified) account.
      await NotificationModel.insertMany(accountIds.map((accountId) => ({ ...data, accountId })), { ordered: false });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
    // Open pages of these accounts reload their list and play the chime.
    notificationEvents.publish(accountIds);
  },

  /** Marks a published post as announced; false when it was announced already. */
  async claimMediaAnnouncement(mediaId: string): Promise<boolean> {
    const result = await MediaModel.updateOne(
      { _id: mediaId, status: "published", isDeleted: { $ne: true }, newsNotifiedAt: null },
      { $set: { newsNotifiedAt: new Date() } },
      { timestamps: false },
    );
    return result.modifiedCount > 0;
  },

  /** Same as insertForAccounts, but an older one of the same kind is replaced (shows as new and unread). */
  async replaceForAccounts(accountIds: string[], data: NotificationInput): Promise<void> {
    if (!accountIds.length) return;
    await NotificationModel.deleteMany({ accountId: { $in: accountIds }, type: data.type, refId: data.refId });
    await notificationRepository.insertForAccounts(accountIds, data);
  },

  async activeAccountIds(): Promise<string[]> {
    const rows = await AccountModel.find({ status: "active", isDeleted: { $ne: true } }).select("_id").lean();
    return rows.map((row) => String(row._id));
  },

  async activeAccountIdByEmail(email: string): Promise<string | null> {
    const row = await AccountModel.findOne({ email: email.trim().toLowerCase(), status: "active", isDeleted: { $ne: true } }).select("_id").lean();
    return row ? String(row._id) : null;
  },

  list(accountId: string, limit: number, before?: Date) {
    return NotificationModel.find({ accountId, ...(before ? { createdAt: { $lt: before } } : {}) })
      .select("type title message link readAt createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
  },

  countUnread(accountId: string) {
    return NotificationModel.countDocuments({ accountId, readAt: null });
  },

  markRead(accountId: string, id: string) {
    if (!mongoose.isValidObjectId(id)) return Promise.resolve(null);
    return NotificationModel.findOneAndUpdate({ _id: id, accountId }, { $set: { readAt: new Date() } }, { returnDocument: "after" })
      .select("_id").lean();
  },

  markAllRead(accountId: string) {
    return NotificationModel.updateMany({ accountId, readAt: null }, { $set: { readAt: new Date() } });
  },

  removeByRef(type: NotificationType, refId: string) {
    return NotificationModel.deleteMany({ type, refId });
  },
};
