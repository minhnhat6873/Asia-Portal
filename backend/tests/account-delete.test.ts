import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { adminAccountService } from "../src/services/admin/account.service";
import { accountAdministrationRepository } from "../src/repositories/admin/account-administration.repository";
import type { ClientSession } from "mongoose";

const targetId = "507f1f77bcf86cd799439012";
const actorId = "507f1f77bcf86cd799439abc";
const session = {} as ClientSession;
const account = { _id: targetId, name: "Nguyễn Văn An", email: "an@asiafnb.com", role: "manager", status: "active", password: "stored-password-hash", permissionGroupIds: [] };

describe("account deletion", () => {
  beforeEach(() => {
    jest.spyOn(accountAdministrationRepository, "runExclusive").mockImplementation((work) => work(session));
    jest.spyOn(adminAccountRepository, "findActiveById").mockResolvedValue({ ...account, _id: actorId, role: "admin" } as never);
    jest.spyOn(adminAccountRepository, "countActiveAdmins").mockResolvedValue(2);
    jest.spyOn(adminAccountRepository, "findById").mockResolvedValue(account as never);
    jest.spyOn(adminAccountRepository, "deleteById").mockResolvedValue(account as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it("rejects an invalid ID before querying MongoDB", async () => {
    await expect(adminAccountService.deleteAccount("invalid", actorId)).rejects.toMatchObject({ statusCode: 400 });
    expect(adminAccountRepository.findById).not.toHaveBeenCalled();
    expect(adminAccountRepository.deleteById).not.toHaveBeenCalled();
  });

  it.each([actorId, actorId.toUpperCase()])("protects the current account: %s", async (id) => {
    await expect(adminAccountService.deleteAccount(id, actorId)).rejects.toMatchObject({ statusCode: 400 });
    expect(adminAccountRepository.findById).not.toHaveBeenCalled();
    expect(adminAccountRepository.deleteById).not.toHaveBeenCalled();
  });

  it("protects the last active Admin", async () => {
    jest.mocked(adminAccountRepository.findById).mockResolvedValue({ ...account, role: "admin" } as never);
    jest.mocked(adminAccountRepository.countActiveAdmins).mockResolvedValue(1);
    await expect(adminAccountService.deleteAccount(targetId, actorId)).rejects.toMatchObject({ statusCode: 400 });
    expect(adminAccountRepository.deleteById).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing account", async () => {
    jest.mocked(adminAccountRepository.findById).mockResolvedValue(null);
    await expect(adminAccountService.deleteAccount(targetId, actorId)).rejects.toMatchObject({ statusCode: 404 });
    expect(adminAccountRepository.deleteById).not.toHaveBeenCalled();
  });

  it.each([["admin", "active"], ["admin", "inactive"], ["manager", "active"], ["manager", "inactive"], ["user", "pending"]])("deletes a %s/%s account and excludes secrets", async (role, status) => {
    const stored = { ...account, role, status };
    jest.mocked(adminAccountRepository.findById).mockResolvedValue(stored as never);
    jest.mocked(adminAccountRepository.deleteById).mockResolvedValue(stored as never);
    const deleted = await adminAccountService.deleteAccount(targetId, actorId);
    expect(adminAccountRepository.deleteById).toHaveBeenCalledWith(targetId, session);
    expect(deleted).toMatchObject({ id: targetId, role, status });
    expect(deleted).not.toHaveProperty("password");
  });

  it("does not report success if the account was removed or promoted concurrently", async () => {
    jest.mocked(adminAccountRepository.deleteById).mockResolvedValue(null);
    await expect(adminAccountService.deleteAccount(targetId, actorId)).rejects.toMatchObject({ statusCode: 409 });
  });
});
