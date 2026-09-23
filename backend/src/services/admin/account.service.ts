import mongoose from "mongoose";

import {
  type Account,
  type AccountResponse,
  type CreateAdminAccountInput,
  type ResetAccountPasswordInput,
  type UpdateAdminAccountInput,
} from "../../interfaces/account.interface";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { permissionGroupRepository } from "../../repositories/admin/permission-group.repository";
import { AppError } from "../../utils/errors/AppError";

type StoredAccount = Account & { _id: unknown };

function toAccountResponse(account: StoredAccount): AccountResponse {
  return {
    id: String(account._id),
    name: account.name,
    email: account.email,
    role: account.role,
    status: account.status,
    permissionGroupIds: (account.permissionGroupIds ?? []).map((id) => String(id)),
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

async function ensureActiveGroups(groupIds: string[]): Promise<void> {
  if (groupIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new AppError(400, "Có mã nhóm quyền không hợp lệ");
  }

  const groups = await permissionGroupRepository.findActiveByIds(groupIds);
  if (groups.length !== new Set(groupIds).size) {
    throw new AppError(400, "Có nhóm quyền không tồn tại hoặc đã ngừng hoạt động");
  }
}

function ensureValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Mã tài khoản không hợp lệ");
  }
}

export const adminAccountService = {
  async getAccounts(): Promise<AccountResponse[]> {
    const accounts = await adminAccountRepository.findAll();
    return accounts.map((account) => toAccountResponse(account));
  },

  async createAccount(
    data: CreateAdminAccountInput,
  ): Promise<AccountResponse> {
    const existingAccount = await adminAccountRepository.findByEmail(data.email);
    if (existingAccount) {
      throw new AppError(409, "Email đã được sử dụng");
    }

    const groupIds = data.permissionGroupIds ?? [];
    await ensureActiveGroups(groupIds);

    const account = await adminAccountRepository.create({
      ...data,
      status: "active",
      permissionGroupIds: groupIds,
    });

    return toAccountResponse(account.toObject());
  },

  async updateAccount(
    id: string,
    data: UpdateAdminAccountInput,
    currentAdminId: string,
  ): Promise<AccountResponse> {
    ensureValidId(id);

    const existingAccount = await adminAccountRepository.findById(id);
    if (!existingAccount) {
      throw new AppError(404, "Không tìm thấy tài khoản");
    }

    if (
      id === currentAdminId &&
      (data.role !== undefined || data.status !== undefined || data.permissionGroupIds !== undefined)
    ) {
      throw new AppError(
        400,
        "Không thể tự đổi quyền hoặc khóa tài khoản đang đăng nhập",
      );
    }

    const updateData: UpdateAdminAccountInput = { ...data };
    if (data.permissionGroupIds !== undefined) {
      await ensureActiveGroups(data.permissionGroupIds);
    }

    const account = await adminAccountRepository.updateById(id, updateData);
    if (!account) {
      throw new AppError(404, "Không tìm thấy tài khoản");
    }

    return toAccountResponse(account);
  },

  async resetPassword(
    id: string,
    data: ResetAccountPasswordInput,
  ): Promise<void> {
    ensureValidId(id);
    const account = await adminAccountRepository.resetPassword(id, data.password);
    if (!account) {
      throw new AppError(404, "Không tìm thấy tài khoản");
    }
  },
};
