import type {
  AccountResponse,
  RegisterAccountInput,
} from "../../interfaces/account.interface";
import { userAccountRepository } from "../../repositories/user/account.repository";
import { AppError } from "../../utils/errors/AppError";

export const userAccountService = {
  async register(data: RegisterAccountInput): Promise<AccountResponse> {
    const existingAccount = await userAccountRepository.findByEmail(data.email);
    if (existingAccount) {
      throw new AppError(409, "Email đã được sử dụng");
    }

    const account = await userAccountRepository.create({
      ...data,
      role: "user",
      status: "pending",
      permissionGroupIds: [],
    });
    const created = account.toObject();

    return {
      id: String(created._id),
      name: created.name,
      email: created.email,
      role: created.role,
      status: created.status,
      permissionGroupIds: [],
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  },
};
