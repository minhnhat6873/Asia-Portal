import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
import { accountContactService } from "../account-contact.service";
import { accountAdministrationRepository } from "../../repositories/admin/account-administration.repository";

type StoredAccount = Account & { _id: unknown };

function toAccountResponse(account: StoredAccount): AccountResponse {
  return {
    id: String(account._id),
    name: account.name,
    email: account.email,
    phone: account.phone,
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

async function withAdminMutation<T>(actorId: string, work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  return accountAdministrationRepository.runExclusive(async (session) => {
    // Reload after acquiring the lock: an already-authorized concurrent request
    // must stop if its actor has since been demoted, locked or deleted.
    const actor = await adminAccountRepository.findActiveById(actorId, session);
    if (!actor || actor.role !== "admin") throw new AppError(403, "Chỉ Admin gốc đang hoạt động mới được quản lý tài khoản.");
    return work(session);
  });
}

async function protectLastAdmin(account: StoredAccount, session: mongoose.ClientSession): Promise<void> {
  if (account.role === "admin" && account.status === "active" && await adminAccountRepository.countActiveAdmins(session) <= 1) {
    throw new AppError(400, "Hệ thống phải có ít nhất một Admin gốc đang hoạt động.");
  }
}

export const adminAccountService = {
  async getAccounts(): Promise<AccountResponse[]> {
    const accounts = await adminAccountRepository.findAll();
    return accounts.map((account) => toAccountResponse(account));
  },

  async createAccount(
    data: CreateAdminAccountInput,
    currentAdminId: string,
  ): Promise<AccountResponse> {
    await accountContactService.ensureAvailable(data);

    const groupIds = data.role === "admin" ? [] : data.permissionGroupIds ?? [];
    await ensureActiveGroups(groupIds);

    return withAdminMutation(currentAdminId, async (session) => {
      const account = await adminAccountRepository.create({
        ...data,
        email: data.email.trim().toLowerCase(),
        status: "active",
        permissionGroupIds: groupIds,
      }, session);
      return toAccountResponse(account.toObject());
    });
  },

  async updateAccount(
    id: string,
    data: UpdateAdminAccountInput,
    currentAdminId: string,
  ): Promise<AccountResponse> {
    ensureValidId(id);

    return withAdminMutation(currentAdminId, async (session) => {
      const existingAccount = await adminAccountRepository.findById(id, session);
      if (!existingAccount) {
        throw new AppError(404, "Không tìm thấy tài khoản");
      }

      const isSelf = id.toLowerCase() === currentAdminId.toLowerCase();
      if (
        isSelf &&
        ((data.role !== undefined && data.role !== existingAccount.role) || (data.status !== undefined && data.status !== "active"))
      ) {
        throw new AppError(400, "Không thể tự đổi quyền hoặc khóa tài khoản đang đăng nhập");
      }

      const updateData: UpdateAdminAccountInput = { ...data };
      const nextRole = data.role ?? existingAccount.role;
      const nextStatus = data.status ?? existingAccount.status;
      if (nextRole !== "admin" || nextStatus !== "active") await protectLastAdmin(existingAccount, session);
      if (nextRole === "admin") updateData.permissionGroupIds = [];
      else if (data.permissionGroupIds !== undefined) {
        await ensureActiveGroups(data.permissionGroupIds);
      }

      const account = await adminAccountRepository.updateById(id, updateData, existingAccount.role, session);
      if (!account) {
        throw new AppError(409, "Tài khoản đã thay đổi. Vui lòng tải lại danh sách.");
      }

      return toAccountResponse(account);
    });
  },

  async resetPassword(
    id: string,
    data: ResetAccountPasswordInput,
    currentAdminId: string,
  ): Promise<void> {
    ensureValidId(id);
    if (id.toLowerCase() === currentAdminId.toLowerCase()) {
      throw new AppError(400, "Vui lòng đổi mật khẩu của mình tại Thông tin tài khoản và nhập mật khẩu hiện tại.");
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    return withAdminMutation(currentAdminId, async (session) => {
      const existingAccount = await adminAccountRepository.findById(id, session);
      if (!existingAccount) throw new AppError(404, "Không tìm thấy tài khoản");
      const account = await adminAccountRepository.resetManagedPassword(id, passwordHash, session);
      if (!account) throw new AppError(409, "Tài khoản đã thay đổi. Vui lòng tải lại danh sách.");
    });
  },

  async deleteAccount(id: string, currentAdminId: string): Promise<AccountResponse> {
    ensureValidId(id);
    if (id.toLowerCase() === currentAdminId.toLowerCase()) {
      throw new AppError(400, "Không thể xóa tài khoản đang đăng nhập.");
    }
    return withAdminMutation(currentAdminId, async (session) => {
      const existingAccount = await adminAccountRepository.findById(id, session);
      if (!existingAccount) throw new AppError(404, "Không tìm thấy tài khoản.");
      await protectLastAdmin(existingAccount, session);
      const deleted = await adminAccountRepository.deleteById(id, session);
      if (!deleted) throw new AppError(409, "Tài khoản đã thay đổi. Vui lòng tải lại danh sách.");
      return toAccountResponse(deleted);
    });
  },
};
