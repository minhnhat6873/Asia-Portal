import type { ClientSession } from "mongoose";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { accountAdministrationRepository } from "../src/repositories/admin/account-administration.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { adminAccountService } from "../src/services/admin/account.service";
import { lockAccountSchema } from "../src/validates/admin/account.validate";
import AccountModel from "../src/models/account.model";

// Lock/unlock and the account trash. Admin gốc may lock anyone but themself and the last
// active Admin gốc; a manager with "accounts:manage-users" may lock user accounts only.
// Deleting moves an account to the trash; only "accounts:trash" restores or deletes for good.
const adminId = "507f1f77bcf86cd799439041", otherAdminId = "507f1f77bcf86cd799439042", managerId = "507f1f77bcf86cd799439043", userId = "507f1f77bcf86cd799439044", otherManagerId = "507f1f77bcf86cd799439045";
const session = {} as ClientSession;
type Stored = { _id: string; name: string; email: string; role: string; status: string; permissionGroupIds: string[]; isDeleted?: boolean; lock?: object | null };
let stored: Record<string, Stored>;
let managerActions: string[];

beforeEach(() => {
  managerActions = ["accounts:manage-users"];
  stored = {
    [adminId]: { _id: adminId, name: "Admin Một", email: "a1@asiafnb.com", role: "admin", status: "active", permissionGroupIds: [] },
    [otherAdminId]: { _id: otherAdminId, name: "Admin Hai", email: "a2@asiafnb.com", role: "admin", status: "active", permissionGroupIds: [] },
    [managerId]: { _id: managerId, name: "HR", email: "hr@asiafnb.com", role: "manager", status: "active", permissionGroupIds: ["507f1f77bcf86cd7994390aa"] },
    [otherManagerId]: { _id: otherManagerId, name: "Quản Lý", email: "ql@asiafnb.com", role: "manager", status: "active", permissionGroupIds: [] },
    [userId]: { _id: userId, name: "Nhân Viên", email: "nv@asiafnb.com", role: "user", status: "active", permissionGroupIds: [] },
  };
  jest.spyOn(accountAdministrationRepository, "runExclusive").mockImplementation((work) => work(session));
  jest.spyOn(adminAccountRepository, "findActiveById").mockImplementation((id) => Promise.resolve(stored[String(id)]?.status === "active" && !stored[String(id)]?.isDeleted ? stored[String(id)] : null) as never);
  jest.spyOn(adminAccountRepository, "findById").mockImplementation((id) => Promise.resolve(stored[String(id)] ?? null) as never);
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockImplementation((ids) => Promise.resolve(ids.map(() => ({ actions: managerActions }))) as never);
  jest.spyOn(adminAccountRepository, "countActiveAdmins").mockImplementation(() => Promise.resolve(Object.values(stored).filter((a) => a.role === "admin" && a.status === "active").length) as never);
  jest.spyOn(adminAccountRepository, "lock").mockImplementation((id, lock) => Promise.resolve({ ...stored[String(id)], status: "inactive", lock }) as never);
  jest.spyOn(adminAccountRepository, "unlock").mockImplementation((id) => Promise.resolve({ ...stored[String(id)], status: "active", lock: null }) as never);
  jest.spyOn(adminAccountRepository, "restore").mockImplementation((id, lock) => Promise.resolve({ ...stored[String(id)], isDeleted: false, status: "inactive", lock }) as never);
  jest.spyOn(adminAccountRepository, "permanentlyDelete").mockImplementation((id) => Promise.resolve(stored[String(id)]) as never);
});
afterEach(() => jest.restoreAllMocks());

describe("locking", () => {
  it("lets Admin gốc lock another Admin gốc and records who and why", async () => {
    const result = await adminAccountService.lockAccount(otherAdminId, "  Nghi lộ mật khẩu ", adminId);
    expect(result).toMatchObject({ status: "inactive", lock: { kind: "manual", note: "Nghi lộ mật khẩu", byName: "Admin Một" } });
    expect(adminAccountRepository.lock).toHaveBeenCalledWith(otherAdminId, expect.objectContaining({ kind: "manual", note: "Nghi lộ mật khẩu" }), "admin", session);
  });

  it("leaves the reason out when none is given", async () => {
    await adminAccountService.lockAccount(userId, "   ", adminId);
    expect(jest.mocked(adminAccountRepository.lock).mock.calls[0][1]).not.toHaveProperty("note");
  });

  it("refuses to lock yourself or the last active Admin gốc", async () => {
    await expect(adminAccountService.lockAccount(adminId, "", adminId)).rejects.toMatchObject({ statusCode: 400 });
    // e.g. a concurrent change left the target as the only active Admin gốc.
    jest.mocked(adminAccountRepository.countActiveAdmins).mockResolvedValue(1);
    await expect(adminAccountService.lockAccount(otherAdminId, "", adminId)).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("ít nhất một Admin gốc") });
    expect(adminAccountRepository.lock).not.toHaveBeenCalled();
  });

  it("lets a manager lock and unlock user accounts only", async () => {
    await expect(adminAccountService.lockAccount(userId, "", managerId)).resolves.toMatchObject({ status: "inactive" });
    for (const target of [otherManagerId, adminId]) {
      await expect(adminAccountService.lockAccount(target, "", managerId)).rejects.toMatchObject({ statusCode: 403 });
    }
    stored[otherManagerId]!.status = "inactive";
    await expect(adminAccountService.unlockAccount(otherManagerId, managerId)).rejects.toMatchObject({ statusCode: 403 });
    stored[userId]!.status = "inactive";
    await expect(adminAccountService.unlockAccount(userId, managerId)).resolves.toMatchObject({ status: "active", lock: null });
  });

  it("rejects locking a locked account, unlocking an active one, or touching trashed accounts", async () => {
    stored[userId]!.status = "inactive";
    await expect(adminAccountService.lockAccount(userId, "", adminId)).rejects.toMatchObject({ statusCode: 409 });
    await expect(adminAccountService.unlockAccount(otherManagerId, adminId)).rejects.toMatchObject({ statusCode: 409 });
    stored[otherManagerId]!.isDeleted = true;
    await expect(adminAccountService.lockAccount(otherManagerId, "", adminId)).rejects.toMatchObject({ statusCode: 404 });
    await expect(adminAccountService.updateAccount(otherManagerId, { name: "Tên Mới" }, adminId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("limits the reason to 200 characters", () => {
    expect(lockAccountSchema.validate({ reason: "x".repeat(201) }).error).toBeDefined();
    expect(lockAccountSchema.validate({}).value).toEqual({ reason: "" });
  });

  it("records a manual lock when the status is changed from the edit form, and clears it on unlock", async () => {
    const update = jest.spyOn(adminAccountRepository, "updateById").mockImplementation((id, data) => Promise.resolve({ ...stored[String(id)], ...data }) as never);
    await adminAccountService.updateAccount(userId, { status: "inactive" }, adminId);
    expect(update.mock.calls[0][1]).toMatchObject({ lock: { kind: "manual", byName: "Admin Một" } });
    stored[userId]!.status = "inactive";
    await adminAccountService.updateAccount(userId, { status: "active" }, adminId);
    expect(update.mock.calls[1][1]).toMatchObject({ lock: null });
  });
});

describe("account trash", () => {
  beforeEach(() => { for (const id of [userId, otherManagerId]) stored[id]!.isDeleted = true; });

  it("lists the trash with the same scope as the list", async () => {
    const findDeleted = jest.spyOn(adminAccountRepository, "findDeleted").mockResolvedValue([]);
    await adminAccountService.getDeletedAccounts({ role: "manager" });
    expect(findDeleted).toHaveBeenLastCalledWith(["user"]);
    await adminAccountService.getDeletedAccounts({ role: "admin" });
    expect(findDeleted).toHaveBeenLastCalledWith(undefined);
  });

  it("restores an account still locked, so it cannot sign in until unlocked", async () => {
    await expect(adminAccountService.restoreAccount(userId, adminId)).resolves.toMatchObject({ status: "inactive", lock: { kind: "restored", byName: "Admin Một" } });
  });

  it("deletes for good only accounts already in the trash", async () => {
    await expect(adminAccountService.permanentlyDeleteAccount(userId, adminId)).resolves.toMatchObject({ id: userId });
    await expect(adminAccountService.permanentlyDeleteAccount(adminId, otherAdminId)).rejects.toMatchObject({ statusCode: 404 });
    await expect(adminAccountService.restoreAccount(adminId, otherAdminId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("requires the trash permission for managers, and only for user accounts", async () => {
    await expect(adminAccountService.restoreAccount(userId, managerId)).rejects.toMatchObject({ statusCode: 403 });
    await expect(adminAccountService.permanentlyDeleteAccount(userId, managerId)).rejects.toMatchObject({ statusCode: 403 });
    managerActions = ["accounts:manage-users", "accounts:trash"];
    await expect(adminAccountService.restoreAccount(userId, managerId)).resolves.toMatchObject({ id: userId });
    await expect(adminAccountService.permanentlyDeleteAccount(otherManagerId, managerId)).rejects.toMatchObject({ statusCode: 403 });
    expect(adminAccountRepository.permanentlyDelete).not.toHaveBeenCalled();
  });

  it("does not grant the trash to a manager without the account permission", async () => {
    managerActions = ["accounts:trash"];
    await expect(adminAccountService.restoreAccount(userId, managerId)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("trashed accounts cannot sign in", () => {
  it("excludes the trash from login and from every session check", () => {
    const query = { select: jest.fn().mockReturnThis(), session: jest.fn().mockReturnThis(), lean: jest.fn() };
    jest.mocked(adminAccountRepository.findActiveById).mockRestore();
    const findOne = jest.spyOn(AccountModel, "findOne").mockReturnValue(query as never);
    adminAccountRepository.findByEmailWithPassword("NV@asiafnb.com");
    expect(findOne).toHaveBeenLastCalledWith({ email: "nv@asiafnb.com", isDeleted: { $ne: true } });
    adminAccountRepository.findActiveById(userId);
    expect(findOne).toHaveBeenLastCalledWith({ _id: userId, status: "active", isDeleted: { $ne: true } });
  });
});
