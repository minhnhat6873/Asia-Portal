import type {
  Account,
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

  findByEmailWithPassword(email: string) {
    return AccountModel.findOne({ email: email.toLowerCase() }).select("+password +authVersion");
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

  changeEmailIfUnchanged(id: string, currentEmail: string, newEmail: string, currentPasswordHash: string, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id, email: currentEmail, password: currentPasswordHash, status: "active", role: { $in: ["admin", "manager"] } },
      { $set: { email: newEmail } }, { session, returnDocument: "after", runValidators: true },
    ).lean();
  },

  findActiveById(id: string, session?: ClientSession) {
    return AccountModel.findOne({ _id: id, status: "active" }).select("+authVersion").session(session ?? null).lean();
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

  findAll() {
    return AccountModel.find({}).sort({ createdAt: -1 }).lean();
  },

  countAll() {
    return AccountModel.countDocuments({});
  },

  countByStatus(status: "pending" | "active" | "inactive") {
    return AccountModel.countDocuments({ status });
  },

  findById(id: string, session?: ClientSession) {
    return AccountModel.findById(id).session(session ?? null).lean();
  },

  countActiveAdmins(session: ClientSession) {
    return AccountModel.countDocuments({ role: "admin", status: "active" }).session(session);
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
    return AccountModel.findOneAndUpdate({ _id: id, role: expectedRole }, {
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
      { $set: { password: passwordHash }, $inc: { authVersion: 1 } },
      { returnDocument: "after", runValidators: true, session },
    ).lean();
  },

  deleteById(id: string, session: ClientSession) {
    return AccountModel.findByIdAndDelete(id, { session }).lean();
  },

  resetPassword(id: string, passwordHash: string, session?: ClientSession, expectedEmail?: string) {
    return AccountModel.findOneAndUpdate(
      { _id: id, ...(expectedEmail ? { email: expectedEmail } : {}) }, { $set: { password: passwordHash }, $inc: { authVersion: 1 } },
      { returnDocument: "after", runValidators: true, ...(session ? { session } : {}) },
    ).lean();
  },
};
