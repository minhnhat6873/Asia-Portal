import type { Account, RegisterAccountInput } from "../../interfaces/account.interface";
import AccountModel from "../../models/account.model";

interface VerifiedRegistrationData {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
}

export const userAccountRepository = {
  findByEmail(email: string) {
    return AccountModel.findOne({ email: email.toLowerCase() }).lean();
  },

  async create(data: RegisterAccountInput | Account) {
    await AccountModel.init();
    return AccountModel.create(data);
  },

  async createWithHashedPassword(data: VerifiedRegistrationData) {
    await AccountModel.init();
    const account = new AccountModel({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.passwordHash,
      role: "user",
      status: "pending",
      permissionGroupIds: [],
    });
    account.$locals.passwordAlreadyHashed = true;
    return account.save();
  },
};
