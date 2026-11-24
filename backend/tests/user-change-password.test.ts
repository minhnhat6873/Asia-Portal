// Account pictures come from the employee table; keep these auth tests off the database.
jest.mock("../src/utils/account/accountAvatar", () => ({
  resolveAccountAvatar: jest.fn(async (account: { avatar?: string }) => account.avatar ?? ""),
  resolveAccountAvatars: jest.fn(async () => new Map()),
  removeAccountAvatarFile: jest.fn(async () => undefined),
}));
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { authSessionRepository } from "../src/repositories/admin/auth-session.repository";
import { userAuthService } from "../src/services/user/auth.service";
import { userChangePasswordSchema } from "../src/validates/user/auth.validate";

const id = "507f1f77bcf86cd799439012";
const oldPassword = "Old-password123!";
const newPassword = "New-password456!";
const account = { _id: id, name: "An", email: "an@asiafnb.com", role: "user", status: "active", password: "", authVersion: 3, permissionGroupIds: [] };
const session = { persistent: true, expiresAt: new Date(Date.now() + 86_400_000) };
const previousSecret = process.env.JWT_SECRET;

beforeAll(async () => { process.env.JWT_SECRET = "change-password-test-secret"; account.password = await bcrypt.hash(oldPassword, 4); });
afterAll(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
beforeEach(() => {
  jest.spyOn(adminAccountRepository, "findByIdWithPassword").mockResolvedValue({ ...account } as never);
  jest.spyOn(adminAccountRepository, "findActiveById").mockResolvedValue({ ...account, authVersion: 4 } as never);
  jest.spyOn(adminAccountRepository, "setPasswordIfUnchanged").mockResolvedValue({ ...account, authVersion: 4 } as never);
  jest.spyOn(authSessionRepository, "revokeOlderVersions").mockResolvedValue({ deletedCount: 2 } as never);
  jest.spyOn(authSessionRepository, "create").mockImplementation((data) => Promise.resolve(data) as never);
});
afterEach(() => jest.restoreAllMocks());

it("changes the password, ends other sessions and keeps this device signed in", async () => {
  const result = await userAuthService.changePassword(id, session, oldPassword, newPassword);
  expect(adminAccountRepository.setPasswordIfUnchanged).toHaveBeenCalledWith(id, account.password, expect.any(String));
  expect(authSessionRepository.revokeOlderVersions).toHaveBeenCalledWith(id, 4);
  expect(authSessionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ accountId: id, authVersion: 4, persistent: true }));
  const payload = jwt.decode(result.token) as jwt.JwtPayload;
  expect(payload).toMatchObject({ aud: "asia-user", version: 4, sub: id });
  expect(result.admin).toMatchObject({ role: "user", permissions: [] });
});

it("rejects a wrong current password without changing anything", async () => {
  await expect(userAuthService.changePassword(id, session, "Wrong-password1!", newPassword))
    .rejects.toMatchObject({ statusCode: 400, fieldErrors: { currentPassword: expect.any(String) } });
  expect(adminAccountRepository.setPasswordIfUnchanged).not.toHaveBeenCalled();
});

it("rejects reusing the current password", async () => {
  await expect(userAuthService.changePassword(id, session, oldPassword, oldPassword))
    .rejects.toMatchObject({ statusCode: 400, fieldErrors: { password: expect.any(String) } });
});

it("reports a concurrent change instead of overwriting it", async () => {
  jest.mocked(adminAccountRepository.setPasswordIfUnchanged).mockResolvedValue(null as never);
  await expect(userAuthService.changePassword(id, session, oldPassword, newPassword)).rejects.toMatchObject({ statusCode: 409 });
  expect(authSessionRepository.create).not.toHaveBeenCalled();
});

it("validates the form with the shared password policy", () => {
  const ok = userChangePasswordSchema.validate({ currentPassword: oldPassword, password: newPassword, confirmPassword: newPassword });
  expect(ok.error).toBeUndefined();
  expect(ok.value).not.toHaveProperty("confirmPassword");
  expect(userChangePasswordSchema.validate({ currentPassword: "", password: newPassword, confirmPassword: newPassword }).error).toBeDefined();
  expect(userChangePasswordSchema.validate({ currentPassword: oldPassword, password: newPassword, confirmPassword: "x" }).error?.message).toContain("không khớp");
  expect(userChangePasswordSchema.validate({ currentPassword: oldPassword, password: "Mậtkhẩu-mới123", confirmPassword: "Mậtkhẩu-mới123" }).error).toBeDefined();
});
