import type { Account, RegisterAccountInput } from "../../interfaces/account.interface";
import AccountModel from "../../models/account.model";

export const userAccountRepository = {
  findByEmail(email: string) {
    return AccountModel.findOne({ email: email.toLowerCase() }).lean();
  },

  create(data: RegisterAccountInput | Account) {
    return AccountModel.create(data);
  },
};
