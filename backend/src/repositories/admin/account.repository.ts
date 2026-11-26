import type {
  Account,
  AccountActorRef,
  AccountLock,
  AccountRole,
  CreateAdminAccountInput,
  RegisterAccountInput,
  UpdateAdminAccountInput,
} from "../../interfaces/account.interface";
import AccountModel from "../../models/account.model";
import type { ClientSession } from "mongoose";
import { accountPhonePattern, normalizeAccountPhone } from "../../utils/account/normalizeContact";

export const adminAccountRepository = {
  findForSessions(id: string) {
    return AccountModel.findById(id).select("+authVersion").lean();
  },
  revokeAllSessions(id: string) {
    return AccountModel.findByIdAndUpdate(id, { $inc: { authVersion: 1 } }, { returnDocument: "after" })
      .select("+authVersion").lean();
  },
  removePermissionGroup(groupId: string) {
    return AccountModel.updateMany(
      { permissionGroupIds: groupId, role: { $ne: "admin" } },
      { $pull: { permissionGroupIds: groupId } },
    );
  },

  // Accounts in the trash cannot sign in; they answer like an unknown username.
  findByUsernameWithPassword(username: string) {
    return AccountModel.findOne({ username: username.trim().toLowerCase(), isDeleted: { $ne: true } }).select("+password +authVersion +loginGuard");
  },

  /** Any account (also in the trash): usernames stay unique. */
  findByUsername(username: string, session?: ClientSession) {
    return AccountModel.findOne({ username: username.trim().toLowerCase() }).session(session ?? null).lean();
  },

  /** Accounts made before usernames existed sign in with their email. Safe to run at every start. */
  fillMissingUsernames() {
    return AccountModel.updateMany(
      { $or: [{ username: { $exists: false } }, { username: null }, { username: "" }] },
      [{ $set: { username: { $toLower: { $trim: { input: "$email" } } } } }],
      // Mongoose 9 refuses an aggregation-pipeline update unless asked for explicitly.
      { timestamps: false, updatePipeline: true },
    );
  },

  // ---- wrong passwords (see services/admin/login-guard.service.ts) ----
  /** Starts over when the last wrong password is older than `before`. */
  resetStaleLoginGuard(id: unknown, before: Date) {
    return AccountModel.updateOne(
      { _id: id, "loginGuard.lastFailedAt": { $lt: before } },
      { $set: { loginGuard: { count: 0, level: 0, waitUntil: null } } },
      { timestamps: false },
    );
  },
  addLoginFailure(id: unknown, at: Date) {
    return AccountModel.findOneAndUpdate(
      { _id: id },
      { $inc: { "loginGuard.count": 1 }, $set: { "loginGuard.lastFailedAt": at } },
      { returnDocument: "after", timestamps: false },
    ).select("+loginGuard").lean();
  },
  /** Closes a full round of wrong passwords; only one of several parallel requests wins. */
  closeLoginRound(id: unknown, perRound: number) {
    return AccountModel.findOneAndUpdate(
      { _id: id, "loginGuard.count": { $gte: perRound } },
      { $set: { "loginGuard.count": 0 }, $inc: { "loginGuard.level": 1 } },
      { returnDocument: "after", timestamps: false },
    ).select("+loginGuard").lean();
  },
  setLoginWait(id: unknown, until: Date) {
    return AccountModel.updateOne({ _id: id }, { $set: { "loginGuard.waitUntil": until } }, { timestamps: false });
  },
  /** Third round: lock like the lock button, ending every session. */
  lockForLoginFailures(id: unknown, at: Date) {
    return AccountModel.findOneAndUpdate(
      { _id: id, status: "active", isDeleted: { $ne: true } },
      { $set: { status: "inactive", lock: { kind: "login-failed", at }, loginGuard: null }, $inc: { authVersion: 1 } },
      { returnDocument: "after" },
    ).lean();
  },
  clearLoginGuard(id: unknown) {
    return AccountModel.updateOne({ _id: id }, { $set: { loginGuard: null } }, { timestamps: false });
  },
  /**
   * An Admin gốc who sets a new password through "Quên mật khẩu" lifts a lock caused by wrong
   * passwords (only that kind). Everyone else waits for an admin to unlock them.
   */
  unlockLoginFailed(id: unknown, session?: ClientSession) {
    return AccountModel.updateOne(
      { _id: id, role: "admin", status: "inactive", "lock.kind": "login-failed", isDeleted: { $ne: true } },
      { $set: { status: "active", lock: null, loginGuard: null } },
      { ...(session ? { session } : {}) },
    );
  },

  findByIdWithPassword(id: string) {
    return AccountModel.findById(id).select("+password");
  },

  changePasswordIfUnchanged(id: string, email: string, currentPasswordHash: string, newPasswordHash: string, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id, email, password: currentPasswordHash, status: "active", role: { $in: ["admin", "manager"] } },
      { $set: { password: newPasswordHash }, $inc: { authVersion: 1 } }, { session, returnDocument: "after", runValidators: true },
    ).lean();
  },

  // Any role (user portal). Matching the old hash makes a concurrent change lose cleanly.
  setPasswordIfUnchanged(id: string, currentPasswordHash: string, newPasswordHash: string) {
    return AccountModel.findOneAndUpdate(
      { _id: id, password: currentPasswordHash, status: "active", isDeleted: { $ne: true } },
      { $set: { password: newPasswordHash }, $inc: { authVersion: 1 } }, { returnDocument: "after", runValidators: true },
    ).select("+authVersion").lean();
  },

  changeEmailIfUnchanged(id: string, currentEmail: string, newEmail: string, currentPasswordHash: string, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id, email: currentEmail, password: currentPasswordHash, status: "active", role: { $in: ["admin", "manager"] } },
      { $set: { email: newEmail } }, { session, returnDocument: "after", runValidators: true },
    ).lean();
  },

  findActiveById(id: string, session?: ClientSession) {
    return AccountModel.findOne({ _id: id, status: "active", isDeleted: { $ne: true } }).select("+authVersion").session(session ?? null).lean();
  },

  findByEmail(email: string, session?: ClientSession) {
    const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return AccountModel.findOne({ email: new RegExp("^\\s*" + escaped + "\\s*$", "i") }).session(session ?? null).lean();
  },

  findByPhone(phone: string) {
    return AccountModel.findOne({ $or: [
      { phoneKey: normalizeAccountPhone(phone) },
      { phone: accountPhonePattern(phone) },
    ] }).lean();
  },

  findAll(roles?: AccountRole[]) {
    return AccountModel.find({ isDeleted: { $ne: true }, ...(roles ? { role: { $in: roles } } : {}) }).sort({ createdAt: -1 }).lean();
  },

  findDeleted(roles?: AccountRole[]) {
    return AccountModel.find({ isDeleted: true, ...(roles ? { role: { $in: roles } } : {}) }).sort({ deletedAt: -1 }).lean();
  },

  // Emails are stored lowercase; used to show which employees already have an account.
  /** Sets the account's own picture; returns the previous one so its file can be removed. */
  setAvatar(id: string, avatar: string, avatarPublicId: string) {
    return AccountModel.findOneAndUpdate(
      { _id: id, status: "active", isDeleted: { $ne: true } },
      { $set: { avatar, avatarPublicId } },
      { returnDocument: "before" },
    ).select("avatar +avatarPublicId").lean();
  },

  clearAvatar(id: string) {
    return AccountModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { avatar: "" }, $unset: { avatarPublicId: "" } },
      { returnDocument: "before" },
    ).select("avatar +avatarPublicId").lean();
  },

  findByEmails(emails: string[]) {
    return AccountModel.find({ email: { $in: emails.map((email) => email.trim().toLowerCase()) } })
      .select("_id email role status isDeleted").lean();
  },

  // Employee left or was removed: lock the linked login and end its sessions.
  // Admin gốc accounts are never changed automatically.
  lockLinked(id: string, kind: "employee-left" | "employee-deleted") {
    return AccountModel.findOneAndUpdate(
      { _id: id, role: { $ne: "admin" }, status: { $ne: "inactive" }, isDeleted: { $ne: true } },
      { $set: { status: "inactive", lock: { kind, at: new Date() } }, $inc: { authVersion: 1 } },
      { returnDocument: "after" },
    ).lean();
  },

  // Employee permanently deleted: move the linked login to the account trash.
  trashLinked(id: string, by?: AccountActorRef) {
    return AccountModel.findOneAndUpdate(
      { _id: id, role: { $ne: "admin" }, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), ...(by ? { deletedBy: by } : {}), status: "inactive", lock: { kind: "employee-deleted", at: new Date() } }, $inc: { authVersion: 1 } },
      { returnDocument: "after" },
    ).lean();
  },

  countAll() {
    return AccountModel.countDocuments({ isDeleted: { $ne: true } });
  },

  countByStatus(status: "pending" | "active" | "inactive") {
    return AccountModel.countDocuments({ status, isDeleted: { $ne: true } });
  },

  // Lock by hand: sign-in stops and every session ends (authVersion).
  lock(id: string, lock: AccountLock, expectedRole: AccountRole, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id, role: expectedRole, status: { $ne: "inactive" }, isDeleted: { $ne: true } },
      { $set: { status: "inactive", lock }, $inc: { authVersion: 1 } },
      { returnDocument: "after", runValidators: true, session },
    ).lean();
  },

  unlock(id: string, expectedRole: AccountRole, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id, role: expectedRole, status: "inactive", isDeleted: { $ne: true } },
      { $set: { status: "active", lock: null, loginGuard: null } },
      { returnDocument: "after", session },
    ).lean();
  },

  // Soft delete: the account moves to the trash, stops signing in and keeps its email.
  softDelete(id: string, by: AccountActorRef, expectedRole: AccountRole, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id, role: expectedRole, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: by, status: "inactive" }, $inc: { authVersion: 1 } },
      { returnDocument: "after", session },
    ).lean();
  },

  // Restored accounts stay locked until someone unlocks them.
  restore(id: string, lock: AccountLock, expectedRole: AccountRole, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id, role: expectedRole, isDeleted: true },
      { $set: { isDeleted: false, status: "inactive", lock }, $unset: { deletedAt: 1, deletedBy: 1 } },
      { returnDocument: "after", session },
    ).lean();
  },

  permanentlyDelete(id: string, expectedRole: AccountRole, session: ClientSession) {
    return AccountModel.findOneAndDelete({ _id: id, role: expectedRole, isDeleted: true }, { session }).select("+avatarPublicId").lean();
  },

  findById(id: string, session?: ClientSession) {
    return AccountModel.findById(id).session(session ?? null).lean();
  },

  countActiveAdmins(session: ClientSession) {
    return AccountModel.countDocuments({ role: "admin", status: "active", isDeleted: { $ne: true } }).session(session);
  },

  async create(data: RegisterAccountInput | CreateAdminAccountInput | Account, session?: ClientSession) {
    await AccountModel.init();
    if (session) {
      const accounts = await AccountModel.create([data], { session });
      return accounts[0]!;
    }
    return AccountModel.create(data);
  },

  updateById(id: string, data: UpdateAdminAccountInput, expectedRole: AccountRole, session?: ClientSession) {
    const update = { ...data, ...(data.phone !== undefined ? { phoneKey: normalizeAccountPhone(data.phone) } : {}) };
    return AccountModel.findOneAndUpdate({ _id: id, role: expectedRole, isDeleted: { $ne: true } }, {
      $set: update,
      ...(data.status !== undefined && data.status !== "active" ? { $inc: { authVersion: 1 } } : {}),
    }, {
      returnDocument: "after",
      runValidators: true,
      session,
    }).lean();
  },

  resetManagedPassword(id: string, passwordHash: string, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id },
      { $set: { password: passwordHash, loginGuard: null }, $inc: { authVersion: 1 } },
      { returnDocument: "after", runValidators: true, session },
    ).lean();
  },

  resetPassword(id: string, passwordHash: string, session?: ClientSession, expectedEmail?: string) {
    return AccountModel.findOneAndUpdate(
      { _id: id, ...(expectedEmail ? { email: expectedEmail } : {}) }, { $set: { password: passwordHash, loginGuard: null }, $inc: { authVersion: 1 } },
      { returnDocument: "after", runValidators: true, ...(session ? { session } : {}) },
    ).lean();
  },
};
