import type { ClientSession } from "mongoose";
import bcrypt from "bcryptjs";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { accountAdministrationRepository } from "../src/repositories/admin/account-administration.repository";
import { adminAccountService } from "../src/services/admin/account.service";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { createAccountSchema } from "../src/validates/admin/account.validate";

const ownerId = "507f1f77bcf86cd799439abc", otherAdminId = "507f1f77bcf86cd799439012";
const session = {} as ClientSession;
const account = { _id: ownerId, name: "Admin", email: "owner@asiafnb.com", role: "admin", status: "active", permissionGroupIds: [] };
beforeEach(() => {
  jest.spyOn(accountAdministrationRepository, "runExclusive").mockImplementation((work) => work(session));
  jest.spyOn(adminAccountRepository, "findActiveById").mockResolvedValue({ ...account, _id: otherAdminId } as never);
  jest.spyOn(adminAccountRepository, "findById").mockResolvedValue(account as never);
  jest.spyOn(adminAccountRepository, "updateById").mockResolvedValue(account as never);
  jest.spyOn(adminAccountRepository, "countActiveAdmins").mockResolvedValue(2);
  jest.spyOn(adminAccountRepository, "resetManagedPassword").mockResolvedValue(account as never);
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([]);
});
afterEach(() => jest.restoreAllMocks());

describe("equal root Admin accounts", () => {
  it.each([{ name: "Changed name" }, { role: "manager" as const }, { status: "inactive" as const }])("allows another root Admin to change %j", async (data) => {
    await expect(adminAccountService.updateAccount(ownerId, data, otherAdminId)).resolves.toMatchObject({ id: ownerId });
    expect(adminAccountRepository.updateById).toHaveBeenCalledWith(ownerId, expect.objectContaining(data), "admin", session);
  });
  it.each([ownerId, ownerId.toUpperCase()])("blocks self-demotion/locking: %s", async (id) => {
    for (const data of [{ role: "manager" as const }, { status: "inactive" as const }]) {
      await expect(adminAccountService.updateAccount(id, data, ownerId)).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(adminAccountRepository.updateById).not.toHaveBeenCalled();
  });
  it("allows an Admin to edit their own profile", async () => {
    await adminAccountService.updateAccount(ownerId, { name: "Owner name" }, ownerId);
    expect(adminAccountRepository.updateById).toHaveBeenCalledWith(ownerId, { name: "Owner name", permissionGroupIds: [] }, "admin", session);
  });
  it.each([{ role: "manager" as const }, { status: "inactive" as const }])("blocks removal of the last active root Admin: %j", async (data) => {
    jest.mocked(adminAccountRepository.countActiveAdmins).mockResolvedValue(1);
    await expect(adminAccountService.updateAccount(ownerId, data, otherAdminId)).rejects.toMatchObject({ statusCode: 400 });
    expect(adminAccountRepository.updateById).not.toHaveBeenCalled();
  });
  it.each([null, { ...account, role: "manager" }, { ...account, role: "user" }])("rechecks the actor after acquiring the transaction lock: %j", async (actor) => {
    jest.mocked(adminAccountRepository.findActiveById).mockResolvedValue(actor as never);
    await expect(adminAccountService.updateAccount(ownerId, { status: "inactive" }, otherAdminId)).rejects.toMatchObject({ statusCode: 403 });
    expect(adminAccountRepository.updateById).not.toHaveBeenCalled();
  });
  it("promotes a manager independently of groups", async () => {
    jest.mocked(adminAccountRepository.findById).mockResolvedValue({ ...account, role: "manager" } as never);
    await adminAccountService.updateAccount(ownerId, { role: "admin", permissionGroupIds: ["obsolete-group"] }, otherAdminId);
    expect(adminAccountRepository.updateById).toHaveBeenCalledWith(ownerId, { role: "admin", permissionGroupIds: [] }, "manager", session);
    expect(permissionGroupRepository.findActiveByIds).not.toHaveBeenCalled();
  });
  it("does not report success if the target disappeared", async () => {
    jest.mocked(adminAccountRepository.updateById).mockResolvedValue(null);
    await expect(adminAccountService.updateAccount(ownerId, { name: "New name" }, otherAdminId)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("root Admin creation and passwords", () => {
  it("defaults to manager and accepts the two visible account types", () => {
    const data = { name: "Nguyễn Văn An", email: "an@asiafnb.com", phone: "0901234567", password: "Password123!", confirmPassword: "Password123!" };
    expect(createAccountSchema.validate(data).value.role).toBe("manager");
    expect(createAccountSchema.validate({ ...data, role: "admin" }).error).toBeUndefined();
    expect(createAccountSchema.validate({ ...data, role: "user" }).error).toBeDefined();
  });
  it("creates an Admin without needing permission groups", async () => {
    jest.spyOn(adminAccountRepository, "findByEmail").mockResolvedValue(null);
    jest.spyOn(adminAccountRepository, "findByPhone").mockResolvedValue(null);
    jest.spyOn(adminAccountRepository, "create").mockResolvedValue({ toObject: () => account } as never);
    await adminAccountService.createAccount({ name: "New Admin", email: "new@asiafnb.com", phone: "0901234567", password: "Password123!", role: "admin", permissionGroupIds: ["ignored"] }, otherAdminId);
    expect(adminAccountRepository.create).toHaveBeenCalledWith(expect.objectContaining({ role: "admin", permissionGroupIds: [], status: "active" }), session);
  });
  it("allows an Admin to reset another Admin's password", async () => {
    await adminAccountService.resetPassword(ownerId, { password: "Replacement123!" }, otherAdminId);
    const hash = jest.mocked(adminAccountRepository.resetManagedPassword).mock.calls[0]![1];
    expect(await bcrypt.compare("Replacement123!", hash)).toBe(true);
    expect(adminAccountRepository.resetManagedPassword).toHaveBeenCalledWith(ownerId, hash, session);
  });
  it("uses the authenticated change-password flow for self", async () => {
    await expect(adminAccountService.resetPassword(ownerId, { password: "Replacement123!" }, ownerId)).rejects.toMatchObject({ statusCode: 400 });
    expect(adminAccountRepository.resetManagedPassword).not.toHaveBeenCalled();
  });
});
