import type { QueryFilter, UpdateQuery } from "mongoose";

import type { VehicleBooking, VehicleStatus } from "../interfaces/vehicle-booking.interface";
import AccountModel from "../models/account.model";
import PermissionGroupModel from "../models/permission-group.model";
import VehicleBookingModel from "../models/vehicle-booking.model";

const internalFields = "-departReminderSentAt -hrOverdueNotifiedAt -hrOverdueEmailedAt -pendingOverdueNotifiedAt";
/** Older pending requests are not chased any more (e.g. test data when this check went live). */
const PENDING_OVERDUE_LOOKBACK_MS = 24 * 60 * 60_000;

export const vehicleBookingRepository = {
  create(data: Partial<VehicleBooking>) {
    return VehicleBookingModel.create(data).then((doc) => doc.toObject() as VehicleBooking & { _id: unknown });
  },

  findById(id: string) {
    return VehicleBookingModel.findById(id).select(internalFields).lean();
  },

  findMine(accountId: string, since: Date) {
    return VehicleBookingModel.find({ "requester.accountId": accountId, $or: [{ departAt: { $gte: since } }, { status: { $in: ["pending", "arranged", "arrived"] } }] })
      .select(internalFields).sort({ departAt: -1 }).limit(300).lean();
  },

  list(filter: QueryFilter<VehicleBooking>, skip: number, limit: number) {
    return VehicleBookingModel.find(filter).select(internalFields).sort({ departAt: -1, _id: -1 }).skip(skip).limit(limit).lean();
  },

  count(filter: QueryFilter<VehicleBooking>) {
    return VehicleBookingModel.countDocuments(filter);
  },

  findForReport(from: Date, to: Date) {
    return VehicleBookingModel.find({ departAt: { $gte: from, $lt: to } }).select(internalFields).sort({ departAt: 1 }).lean();
  },

  /** Changes a booking only while it is still in one of the expected states (no lost updates). */
  updateIfStatus(id: string, statuses: VehicleStatus[], update: UpdateQuery<VehicleBooking>, extra: QueryFilter<VehicleBooking> = {}) {
    return VehicleBookingModel.findOneAndUpdate({ _id: id, status: { $in: statuses }, ...extra }, update, { returnDocument: "after", runValidators: true })
      .select(internalFields).lean();
  },

  deleteCancelled(id: string) {
    return VehicleBookingModel.findOneAndDelete({ _id: id, status: "cancelled" }).lean();
  },

  // ---- reminders (job) ----
  findDepartReminders(now: Date, leadMs: number) {
    return VehicleBookingModel.find({
      status: { $in: ["pending", "arranged"] }, departReminderSentAt: null,
      departAt: { $gt: now, $lte: new Date(now.getTime() + leadMs) },
    }).limit(200).lean();
  },
  /** Arranged trips whose expected end passed without HR closing them. */
  findOverdueForHr(now: Date) {
    return VehicleBookingModel.find({
      // "Đã đi xong" already notifies HR (and starts the 30-minute email clock) by itself.
      hrOverdueNotifiedAt: null, status: "arranged", expectedEndAt: { $lte: now },
    }).limit(200).lean();
  },
  findOverdueEmailDue(before: Date) {
    return VehicleBookingModel.find({
      status: { $in: ["arranged", "arrived"] }, hrOverdueEmailedAt: null, hrOverdueNotifiedAt: { $ne: null, $lte: before },
    }).limit(200).lean();
  },
  /** Requests still waiting for HR although their departure time passed before `before`. */
  findPendingOverdue(before: Date) {
    return VehicleBookingModel.find({
      status: "pending", pendingOverdueNotifiedAt: null,
      departAt: { $gt: new Date(before.getTime() - PENDING_OVERDUE_LOOKBACK_MS), $lte: before },
    }).limit(200).lean();
  },
  /** Claims a reminder flag once (several servers or overlapping runs send it only once). */
  claimFlag(id: unknown, field: "departReminderSentAt" | "hrOverdueNotifiedAt" | "hrOverdueEmailedAt" | "pendingOverdueNotifiedAt") {
    return VehicleBookingModel.updateOne({ _id: id, [field]: null }, { $set: { [field]: new Date() } }, { timestamps: false })
      .then((result) => result.modifiedCount > 0);
  },

  /** Active accounts that can manage vehicles: Admin gốc, and managers in an active group with the right. */
  async managerAccounts(): Promise<{ id: string; email: string; name: string }[]> {
    const groups = await PermissionGroupModel.find({ status: "active", actions: "vehicles:manage" }).select("_id").lean();
    const accounts = await AccountModel.find({
      status: "active", isDeleted: { $ne: true },
      $or: [{ role: "admin" }, { role: "manager", permissionGroupIds: { $in: groups.map((group) => group._id) } }],
    }).select("_id email name").lean();
    return accounts.map((account) => ({ id: String(account._id), email: account.email, name: account.name }));
  },
};
