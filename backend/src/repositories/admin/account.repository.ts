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
  removePermissionGroup(groupId: string) {
    return AccountModel.updateMany(
      { permissionGroupIds: groupId, role: { $ne: "admin" } },
      { $pull: { permissionGroupIds: groupId } },
    );
  },

  findByEmailWithPassword(email: string) {
    return AccountModel.findOne({ email: email.toLowerCase() }).select("+password");
  },

  findByIdWithPassword(id: string) {
    return AccountModel.findById(id).select("+password");
  },

  changePasswordIfUnchanged(id: string, email: string, currentPasswordHash: string, newPasswordHash: string, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id, email, password: currentPasswordHash, status: "active", role: { $in: ["admin", "manager"] } },
      { $set: { password: newPasswordHash } }, { session, returnDocument: "after", runValidators: true },
    ).lean();
  },

  changeEmailIfUnchanged(id: string, currentEmail: string, newEmail: string, currentPasswordHash: string, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id, email: currentEmail, password: currentPasswordHash, status: "active", role: { $in: ["admin", "manager"] } },
      { $set: { email: newEmail } }, { session, returnDocument: "after", runValidators: true },
    ).lean();
  },

  findActiveById(id: string, session?: ClientSession) {
    return AccountModel.findOne({ _id: id, status: "active" }).session(session ?? null).lean();
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
    return AccountModel.findOneAndUpdate({ _id: id, role: expectedRole }, data, {
      returnDocument: "after",
      runValidators: true,
      session,
    }).lean();
  },

  resetManagedPassword(id: string, passwordHash: string, session: ClientSession) {
    return AccountModel.findOneAndUpdate(
      { _id: id },
      { $set: { password: passwordHash } },
      { returnDocument: "after", runValidators: true, session },
    ).lean();
  },

  deleteById(id: string, session: ClientSession) {
    return AccountModel.findByIdAndDelete(id, { session }).lean();
  },

  async resetPassword(id: string, password: string) {
    const account = await AccountModel.findById(id).select("+password");
    if (!account) return null;

    account.password = password;
    await account.save();
    return account;
  },
};
