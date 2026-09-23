import type {
  Account,
  CreateAdminAccountInput,
  RegisterAccountInput,
  UpdateAdminAccountInput,
} from "../../interfaces/account.interface";
import AccountModel from "../../models/account.model";

export const adminAccountRepository = {
  findByEmailWithPassword(email: string) {
    return AccountModel.findOne({ email: email.toLowerCase() }).select("+password");
  },

  findActiveById(id: string) {
    return AccountModel.findOne({ _id: id, status: "active" }).lean();
  },

  findByEmail(email: string) {
    return AccountModel.findOne({ email: email.toLowerCase() }).lean();
  },

  findAll() {
    return AccountModel.find({}).sort({ createdAt: -1 }).lean();
  },

  findById(id: string) {
    return AccountModel.findById(id).lean();
  },

  create(data: RegisterAccountInput | CreateAdminAccountInput | Account) {
    return AccountModel.create(data);
  },

  updateById(id: string, data: UpdateAdminAccountInput) {
    return AccountModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  },

  async resetPassword(id: string, password: string) {
    const account = await AccountModel.findById(id).select("+password");
    if (!account) return null;

    account.password = password;
    await account.save();
    return account;
  },
};
