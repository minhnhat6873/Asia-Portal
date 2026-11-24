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
import { emailService } from "../notification/email.service";
import { normalizeAccountPhone } from "../../utils/account/normalizeContact";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";
import { normalizeSearchText } from "../../utils/text/normalizeSearchText";
import type { PermissionAction } from "../../interfaces/permission-group.interface";
import type { AccountActorRef } from "../../interfaces/account.interface";
import { MANAGER_NEEDS_GROUP } from "../../validates/admin/account.validate";
import { resolveAccountAvatars, removeAccountAvatarFile } from "../../utils/account/accountAvatar";

type StoredAccount = Account & { _id: unknown };

// "all": Admin gốc. "users": a manager granted "accounts:manage-users", limited to
// accounts with the user role. Anyone else may not manage accounts.
type AccountScope = "all" | "users";
const MANAGE_USERS: PermissionAction = "accounts:manage-users";
const USERS_ONLY = "Bạn chỉ được quản lý tài khoản Người dùng.";

function requireUserTarget(scope: AccountScope, account: StoredAccount): void {
  if (scope === "users" && account.role !== "user") throw new AppError(403, USERS_ONLY);
}

// Load an account that is still in the list (not in the trash).
async function findListedAccount(id: string, session: mongoose.ClientSession): Promise<StoredAccount> {
  const account = await adminAccountRepository.findById(id, session);
  if (!account || account.isDeleted) throw new AppError(404, "Không tìm thấy tài khoản.");
  return account;
}

async function findTrashedAccount(id: string, session: mongoose.ClientSession): Promise<StoredAccount> {
  const account = await adminAccountRepository.findById(id, session);
  if (!account?.isDeleted) throw new AppError(404, "Không tìm thấy tài khoản trong thùng rác.");
  return account;
}

const changed = () => new AppError(409, "Tài khoản đã thay đổi. Vui lòng tải lại danh sách.");

function toAccountResponse(account: StoredAccount, avatars?: Map<string, string>): AccountResponse {
  return {
    id: String(account._id),
    name: account.name,
    email: account.email,
    phone: account.phone,
    notes: account.notes ?? "",
    role: account.role,
    status: account.status,
    permissionGroupIds: (account.permissionGroupIds ?? []).map((id) => String(id)),
    avatar: avatars?.get(String(account._id)) ?? account.avatar ?? "",
    lock: account.status === "inactive" && account.lock ? { kind: account.lock.kind, note: account.lock.note, byName: account.lock.byName, at: account.lock.at } : null,
    ...(account.isDeleted ? { deletedAt: account.deletedAt, deletedBy: account.deletedBy ? { name: account.deletedBy.name } : undefined } : {}),
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

type MutationActor = { scope: AccountScope; ref: AccountActorRef };

async function withAdminMutation<T>(
  actorId: string,
  work: (session: mongoose.ClientSession, scope: AccountScope, actor: MutationActor) => Promise<T>,
  // Extra permission a manager also needs, e.g. "accounts:trash". Admin gốc has every permission.
  alsoRequires?: PermissionAction,
): Promise<T> {
  return accountAdministrationRepository.runExclusive(async (session) => {
    // Reload after acquiring the lock: an already-authorized concurrent request
    // must stop if its actor has since been demoted, locked, deleted or lost the permission.
    const actor = await adminAccountRepository.findActiveById(actorId, session);
    const ref = actor ? { accountId: String(actor._id), name: actor.name, email: actor.email } : null;
    if (actor?.role === "admin" && ref) return work(session, "all", { scope: "all", ref });
    if (actor?.role === "manager" && ref) {
      const groups = await permissionGroupRepository.findActiveByIds((actor.permissionGroupIds ?? []).map((id: unknown) => String(id)));
      const actions = new Set(groups.flatMap((group) => group.actions));
      if (actions.has(MANAGE_USERS) && (!alsoRequires || actions.has(alsoRequires))) return work(session, "users", { scope: "users", ref });
    }
    throw new AppError(403, "Bạn không có quyền quản lý tài khoản.");
  });
}

async function protectLastAdmin(account: StoredAccount, session: mongoose.ClientSession): Promise<void> {
  if (account.role === "admin" && account.status === "active" && await adminAccountRepository.countActiveAdmins(session) <= 1) {
    throw new AppError(400, "Hệ thống phải có ít nhất một Admin gốc đang hoạt động.");
  }
}

export const adminAccountService = {
  // The route already required the permission; managers only see user accounts.
  async getAccounts(actor: { role: Account["role"] }): Promise<AccountResponse[]> {
    const accounts = await adminAccountRepository.findAll(actor.role === "admin" ? undefined : ["user"]);
    const avatars = await resolveAccountAvatars(accounts);
    return accounts.map((account) => toAccountResponse(account, avatars));
  },

  // Find employee records to link a new account to (by name, code or email).
  async lookupEmployees(query: string) {
    const needle = normalizeSearchText(query);
    if (!needle) return [];
    const employees = (await adminEmployeeRepository.findAllForSearch({ isDeleted: { $ne: true }, status: { $ne: "inactive" } }, { name: 1 }))
      .filter((employee) => normalizeSearchText(`${employee.employeeCode} ${employee.name} ${employee.email}`).includes(needle))
      .slice(0, 8);
    const accounts = await adminAccountRepository.findByEmails(employees.map((employee) => employee.email));
    const byEmail = new Map(accounts.map((account) => [account.email.toLowerCase(), account]));
    return employees.map((employee) => {
      const account = byEmail.get(employee.email.toLowerCase());
      return {
        id: String(employee._id), employeeCode: employee.employeeCode, name: employee.name, email: employee.email,
        phone: employee.phone, department: employee.department, position: employee.position, status: employee.status,
        account: account ? { id: String(account._id), role: account.role, status: account.status, inTrash: account.isDeleted === true } : null,
      };
    });
  },

  async createAccount(
    data: CreateAdminAccountInput,
    currentAdminId: string,
  ): Promise<AccountResponse> {
    await accountContactService.ensureAvailable(data);

    // Only managers carry permission groups, and a manager needs at least one.
    const groupIds = data.role === "manager" ? data.permissionGroupIds ?? [] : [];
    if (data.role === "manager" && !groupIds.length) throw new AppError(400, MANAGER_NEEDS_GROUP);
    await ensureActiveGroups(groupIds);

    return withAdminMutation(currentAdminId, async (session, scope) => {
      if (scope === "users" && (data.role !== "user" || (data.permissionGroupIds?.length ?? 0) > 0)) {
        throw new AppError(403, USERS_ONLY);
      }
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

    return withAdminMutation(currentAdminId, async (session, scope, actor) => {
      const existingAccount = await findListedAccount(id, session);
      requireUserTarget(scope, existingAccount);
      if (scope === "users" && ((data.role !== undefined && data.role !== "user") || (data.permissionGroupIds?.length ?? 0) > 0)) {
        throw new AppError(403, "Bạn không được đổi loại tài khoản hoặc gán nhóm quyền.");
      }

      const isSelf = id.toLowerCase() === currentAdminId.toLowerCase();
      if (
        isSelf &&
        ((data.role !== undefined && data.role !== existingAccount.role) || (data.status !== undefined && data.status !== "active"))
      ) {
        throw new AppError(400, "Không thể tự đổi quyền hoặc khóa tài khoản đang đăng nhập");
      }

      const updateData: UpdateAdminAccountInput = { ...data };
      // Locking from the edit form counts as a manual lock; unlocking clears the reason.
      if (data.status === "inactive" && existingAccount.status !== "inactive") updateData.lock = { kind: "manual", byName: actor.ref.name, at: new Date() };
      else if (data.status !== undefined && data.status !== "inactive") updateData.lock = null;
      if (data.email !== undefined) {
        const email = data.email.trim().toLowerCase();
        if (isSelf && email !== existingAccount.email.trim().toLowerCase()) {
          throw new AppError(400, "Đổi email của chính mình phải xác nhận OTP tại Thông tin tài khoản.");
        }
        if (email !== existingAccount.email.trim().toLowerCase()) {
          await accountContactService.ensureAvailable({ email });
        }
        updateData.email = email;
      }
      if (data.phone !== undefined && normalizeAccountPhone(data.phone) !== normalizeAccountPhone(existingAccount.phone ?? "")) {
        await accountContactService.ensureAvailable({ phone: data.phone });
      }
      const nextRole = data.role ?? existingAccount.role;
      const nextStatus = data.status ?? existingAccount.status;
      if (nextRole !== "admin" || nextStatus !== "active") await protectLastAdmin(existingAccount, session);
      // Only managers carry permission groups. Becoming a manager, or changing a manager's
      // groups, must leave at least one; managers created before this rule are not forced.
      const nextGroups = data.permissionGroupIds ?? (existingAccount.permissionGroupIds ?? []).map((group) => String(group));
      if (nextRole === "manager" && !nextGroups.length && (existingAccount.role !== "manager" || data.permissionGroupIds !== undefined)) {
        throw new AppError(400, MANAGER_NEEDS_GROUP);
      }
      if (nextRole !== "manager") updateData.permissionGroupIds = [];
      else if (data.permissionGroupIds !== undefined) {
        await ensureActiveGroups(data.permissionGroupIds);
      }

      const account = await adminAccountRepository.updateById(id, updateData, existingAccount.role, session);
      if (!account) throw changed();

      return toAccountResponse(account);
    });
  },

  // Lock: Admin gốc may lock anyone except themself and the last active Admin gốc;
  // a manager may lock user accounts only.
  async lockAccount(id: string, reason: string, currentAdminId: string): Promise<AccountResponse> {
    ensureValidId(id);
    if (id.toLowerCase() === currentAdminId.toLowerCase()) throw new AppError(400, "Không thể tự khóa tài khoản đang đăng nhập.");
    return withAdminMutation(currentAdminId, async (session, scope, actor) => {
      const existingAccount = await findListedAccount(id, session);
      requireUserTarget(scope, existingAccount);
      if (existingAccount.status === "inactive") throw new AppError(409, "Tài khoản đã bị khóa.");
      await protectLastAdmin(existingAccount, session);
      const note = reason.trim();
      const account = await adminAccountRepository.lock(id, { kind: "manual", ...(note ? { note } : {}), byName: actor.ref.name, at: new Date() }, existingAccount.role, session);
      if (!account) throw changed();
      return toAccountResponse(account);
    });
  },

  async unlockAccount(id: string, currentAdminId: string): Promise<AccountResponse> {
    ensureValidId(id);
    return withAdminMutation(currentAdminId, async (session, scope) => {
      const existingAccount = await findListedAccount(id, session);
      requireUserTarget(scope, existingAccount);
      if (existingAccount.status !== "inactive") throw new AppError(409, "Tài khoản không ở trạng thái khóa.");
      const account = await adminAccountRepository.unlock(id, existingAccount.role, session);
      if (!account) throw changed();
      return toAccountResponse(account);
    });
  },

  async resetPassword(
    id: string,
    data: ResetAccountPasswordInput,
    currentAdminId: string,
  ): Promise<{ notificationSent: boolean }> {
    ensureValidId(id);
    if (id.toLowerCase() === currentAdminId.toLowerCase()) {
      throw new AppError(400, "Vui lòng đổi mật khẩu của mình tại Thông tin tài khoản và nhập mật khẩu hiện tại.");
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const target = await withAdminMutation(currentAdminId, async (session, scope) => {
      const existingAccount = await findListedAccount(id, session);
      requireUserTarget(scope, existingAccount);
      const account = await adminAccountRepository.resetManagedPassword(id, passwordHash, session);
      if (!account) throw new AppError(409, "Tài khoản đã thay đổi. Vui lòng tải lại danh sách.");
      return { name: account.name, email: account.email };
    });
    let notificationSent = false;
    if (data.notifyUser) {
      try { await emailService.sendManagedPasswordResetNotice(target.email, target.name); notificationSent = true; }
      catch { /* The password was saved; a mail failure must not report the reset as failed. */ }
    }
    return { notificationSent };
  },

  // Soft delete: move the account to the trash. It stops signing in at once and keeps its email.
  async deleteAccount(id: string, currentAdminId: string): Promise<AccountResponse> {
    ensureValidId(id);
    if (id.toLowerCase() === currentAdminId.toLowerCase()) {
      throw new AppError(400, "Không thể xóa tài khoản đang đăng nhập.");
    }
    return withAdminMutation(currentAdminId, async (session, scope, actor) => {
      const existingAccount = await findListedAccount(id, session);
      requireUserTarget(scope, existingAccount);
      await protectLastAdmin(existingAccount, session);
      const deleted = await adminAccountRepository.softDelete(id, actor.ref, existingAccount.role, session);
      if (!deleted) throw changed();
      return toAccountResponse(deleted);
    });
  },

  // Trash (needs "accounts:trash"). Managers only see user accounts.
  async getDeletedAccounts(actor: { role: Account["role"] }): Promise<AccountResponse[]> {
    const accounts = await adminAccountRepository.findDeleted(actor.role === "admin" ? undefined : ["user"]);
    const avatars = await resolveAccountAvatars(accounts);
    return accounts.map((account) => toAccountResponse(account, avatars));
  },

  // Restored accounts come back locked; someone must unlock them before they sign in.
  async restoreAccount(id: string, currentAdminId: string): Promise<AccountResponse> {
    ensureValidId(id);
    return withAdminMutation(currentAdminId, async (session, scope, actor) => {
      const existingAccount = await findTrashedAccount(id, session);
      requireUserTarget(scope, existingAccount);
      const account = await adminAccountRepository.restore(id, { kind: "restored", byName: actor.ref.name, at: new Date() }, existingAccount.role, session);
      if (!account) throw changed();
      return toAccountResponse(account);
    }, "accounts:trash");
  },

  async permanentlyDeleteAccount(id: string, currentAdminId: string): Promise<AccountResponse> {
    ensureValidId(id);
    const deleted = await withAdminMutation(currentAdminId, async (session, scope) => {
      const existingAccount = await findTrashedAccount(id, session);
      requireUserTarget(scope, existingAccount);
      const removed = await adminAccountRepository.permanentlyDelete(id, existingAccount.role, session);
      if (!removed) throw changed();
      return removed;
    }, "accounts:trash");
    // The account is gone; its own picture file goes too (best effort, after the commit).
    await removeAccountAvatarFile(deleted.avatarPublicId);
    return toAccountResponse(deleted);
  },
};
