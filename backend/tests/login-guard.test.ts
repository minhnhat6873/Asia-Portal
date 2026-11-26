import bcrypt from "bcryptjs";

import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { authSessionRepository } from "../src/repositories/admin/auth-session.repository";
import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { adminAuthService } from "../src/services/admin/auth.service";
import { ADMIN_LOCKED_BY_FAILURES, LOCKED_BY_FAILURES, lockedByFailures } from "../src/services/admin/login-guard.service";
/**
 * Simulates the account document and the repository's atomic updates in memory, then drives
 * the real login: 5 wrong -> wait 10 min, 5 more -> wait 30 min, 5 more -> locked.
 */
type Guard = { count: number; level: number; lastFailedAt?: Date; waitUntil?: Date | null };
type FakeAccount = {
  _id: string; name: string; username: string; email: string; role: "admin"; status: string; authVersion: number;
  permissionGroupIds: string[]; password: string; lock: { kind: string; at: Date } | null; loginGuard: Guard | null;
};
function fakeAccountStore(passwordHash: string) {
  const account: FakeAccount = {
    _id: "507f1f77bcf86cd799439012", name: "An", username: "an@asiafnb.com", email: "an@asiafnb.com", role: "admin", status: "active",
    authVersion: 0, permissionGroupIds: [], password: passwordHash, lock: null, loginGuard: null,
  };
  const copy = () => ({ ...account, loginGuard: account.loginGuard ? { ...account.loginGuard } : null });
  return {
    account,
    install(repo: typeof adminAccountRepository) {
      jest.spyOn(repo, "findByUsernameWithPassword").mockImplementation(() => Promise.resolve(copy()) as never);
      jest.spyOn(repo, "resetStaleLoginGuard").mockImplementation((_id, before) => {
        if (account.loginGuard?.lastFailedAt && account.loginGuard.lastFailedAt < before) account.loginGuard = { count: 0, level: 0, waitUntil: null };
        return Promise.resolve({}) as never;
      });
      jest.spyOn(repo, "addLoginFailure").mockImplementation((_id, at) => {
        account.loginGuard = { count: (account.loginGuard?.count ?? 0) + 1, level: account.loginGuard?.level ?? 0, waitUntil: account.loginGuard?.waitUntil ?? null, lastFailedAt: at };
        return Promise.resolve(copy()) as never;
      });
      jest.spyOn(repo, "closeLoginRound").mockImplementation((_id, perRound) => {
        if (!account.loginGuard || account.loginGuard.count < perRound) return Promise.resolve(null) as never;
        account.loginGuard = { ...account.loginGuard, count: 0, level: account.loginGuard.level + 1 };
        return Promise.resolve(copy()) as never;
      });
      jest.spyOn(repo, "setLoginWait").mockImplementation((_id, until) => { account.loginGuard!.waitUntil = until; return Promise.resolve({}) as never; });
      jest.spyOn(repo, "lockForLoginFailures").mockImplementation((_id, at) => {
        Object.assign(account, { status: "inactive", lock: { kind: "login-failed", at }, loginGuard: null });
        return Promise.resolve(copy()) as never;
      });
      jest.spyOn(repo, "clearLoginGuard").mockImplementation(() => { account.loginGuard = null; return Promise.resolve({}) as never; });
    },
  };
}

const password = "Correct-pass1!";
let state: ReturnType<typeof fakeAccountStore>;
const previousSecret = process.env.JWT_SECRET;

beforeAll(() => { process.env.JWT_SECRET = "test-secret-with-enough-length-1234567890"; });
afterAll(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });

beforeEach(async () => {
  jest.useFakeTimers({ advanceTimers: true });
  jest.setSystemTime(new Date("2026-11-25T01:00:00Z"));
  state = fakeAccountStore(await bcrypt.hash(password, 4));
  state.install(adminAccountRepository);
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([]);
  jest.spyOn(adminAccountRepository, "findActiveById").mockImplementation(() => Promise.resolve(state.account.status === "active" ? { ...state.account } : null) as never);
  jest.spyOn(adminEmployeeRepository, "findAvatarsByEmails").mockResolvedValue(new Map());
  jest.spyOn(authSessionRepository, "create").mockResolvedValue({} as never);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

const login = (pass: string) => adminAuthService.login({ username: "an@asiafnb.com", password: pass });
const wrong = () => login("Wrong-pass1!").then(() => { throw new Error("signed in"); }, (error: { statusCode: number; message: string }) => error);
const minutes = (n: number) => jest.setSystemTime(Date.now() + n * 60_000);

it("5 wrong passwords: wait 10 minutes, without even trying the right one", async () => {
  for (let i = 0; i < 4; i += 1) expect(await wrong()).toMatchObject({ statusCode: 401, message: "Tên đăng nhập hoặc mật khẩu không chính xác." });
  expect(await wrong()).toMatchObject({ statusCode: 429, message: "Bạn đã nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau 10 phút." });
  await expect(login(password)).rejects.toMatchObject({ statusCode: 429 });
  minutes(10);
  await expect(login(password)).resolves.toBeDefined();
  // A correct password starts over.
  expect(state.account.loginGuard).toBeNull();
});

it("then 30 minutes, then the account is locked like the lock button; the last round warns", async () => {
  for (let i = 0; i < 5; i += 1) await wrong();
  minutes(10);
  for (let i = 0; i < 4; i += 1) await wrong();
  expect((await wrong()).message).toContain("30 phút");
  minutes(30);
  expect((await wrong()).message).toBe("Tên đăng nhập hoặc mật khẩu không chính xác. Còn 4 lần thử trước khi tài khoản bị khóa.");
  for (let i = 0; i < 3; i += 1) await wrong();
  expect(await wrong()).toMatchObject({ statusCode: 403, message: ADMIN_LOCKED_BY_FAILURES });
  expect(state.account).toMatchObject({ status: "inactive", lock: { kind: "login-failed" } });
  // Even the right password is refused now.
  await expect(login(password)).rejects.toMatchObject({ statusCode: 403, message: ADMIN_LOCKED_BY_FAILURES });
});

it("24 hours without a wrong password starts over", async () => {
  for (let i = 0; i < 5; i += 1) await wrong();
  minutes(24 * 60 + 1);
  for (let i = 0; i < 4; i += 1) expect((await wrong()).statusCode).toBe(401);
  expect(state.account.loginGuard).toMatchObject({ count: 4, level: 0 });
});

it("an unknown username gets the same answer and touches nothing", async () => {
  jest.mocked(adminAccountRepository.findByUsernameWithPassword).mockResolvedValue(null);
  await expect(login("x")).rejects.toMatchObject({ statusCode: 401, message: "Tên đăng nhập hoặc mật khẩu không chính xác." });
  expect(adminAccountRepository.addLoginFailure).not.toHaveBeenCalled();
});

it("a locked or waiting account does not count more wrong passwords", async () => {
  state.account.status = "inactive";
  state.account.lock = { kind: "manual", at: new Date() };
  await expect(login("Wrong-pass1!")).rejects.toMatchObject({ statusCode: 401 });
  expect(adminAccountRepository.addLoginFailure).not.toHaveBeenCalled();
});

it("only an Admin gốc is told to unlock with \"Quên mật khẩu\"; everyone else asks an admin", () => {
  expect(lockedByFailures("user").message).toBe(LOCKED_BY_FAILURES);
  expect(lockedByFailures("manager").message).toBe(LOCKED_BY_FAILURES);
  expect(LOCKED_BY_FAILURES).not.toContain("Quên mật khẩu");
  expect(lockedByFailures("admin").message).toBe(ADMIN_LOCKED_BY_FAILURES);
});

it("test switch LOGIN_TEST_LOCK_ON_FIRST_FAIL: one wrong password locks at once", async () => {
  process.env.LOGIN_TEST_LOCK_ON_FIRST_FAIL = "true";
  try {
    expect(await wrong()).toMatchObject({ statusCode: 403, message: ADMIN_LOCKED_BY_FAILURES });
    expect(state.account).toMatchObject({ status: "inactive", lock: { kind: "login-failed" } });
  } finally { delete process.env.LOGIN_TEST_LOCK_ON_FIRST_FAIL; }
});
