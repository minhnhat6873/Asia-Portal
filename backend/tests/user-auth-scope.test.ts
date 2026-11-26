// Account pictures come from the employee table; keep these auth tests off the database.
jest.mock("../src/utils/account/accountAvatar", () => ({
  resolveAccountAvatar: jest.fn(async (account: { avatar?: string }) => account.avatar ?? ""),
  resolveAccountAvatars: jest.fn(async () => new Map()),
  removeAccountAvatarFile: jest.fn(async () => undefined),
}));
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { authSessionRepository } from "../src/repositories/admin/auth-session.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { adminEmployeeRepository } from "../src/repositories/admin/employee.repository";
import { requireAdminAuth } from "../src/middlewares/auth.middleware";
import { login as adminLogin, refreshLogin as adminRefresh } from "../src/controllers/admin/auth.controller";
import { loginUser, currentUser, refreshUser, USER_ACCESS_COOKIE, USER_REFRESH_COOKIE } from "../src/controllers/user/auth.controller";
import { globalErrorHandler } from "../src/middlewares/error.middleware";
import { AUTH_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME } from "../src/config/auth.config";
import type { AuthSession } from "../src/interfaces/auth-session.interface";

// One person has one company email, so one account serves both portals:
// any role may use the user portal with user-level access, only admins enter the admin portal.
const id = "507f1f77bcf86cd799439012";
const password = "Test-password123!";
const account = { _id: id, name: "Test", email: "test@asiafnb.com", phone: "0901234567", role: "admin", status: "active", password: "", authVersion: 0, permissionGroupIds: [] as string[] };
const sessions = new Map<string, AuthSession>();
let server: Server, url: string;
const previousSecret = process.env.JWT_SECRET;

beforeAll(async () => {
  process.env.JWT_SECRET = "user-auth-scope-test-only-secret";
  account.password = await bcrypt.hash(password, 4);
  const app = express();
  app.use(express.json(), cookieParser());
  app.post("/user/login", loginUser); app.get("/user/me", currentUser); app.post("/user/refresh", refreshUser);
  app.post("/admin/login", adminLogin); app.post("/admin/refresh", adminRefresh);
  app.get("/admin/protected", requireAdminAuth, (_req, res) => res.json({ success: true }));
  app.use(globalErrorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
beforeEach(() => {
  account.role = "admin"; account.status = "active"; account.authVersion = 0; sessions.clear();
  jest.spyOn(adminAccountRepository, "findByUsernameWithPassword").mockImplementation(() => Promise.resolve({ ...account }) as never);
  // Wrong-password bookkeeping (covered in login-guard.test.ts).
  jest.spyOn(adminAccountRepository, "resetStaleLoginGuard").mockResolvedValue({} as never);
  jest.spyOn(adminAccountRepository, "addLoginFailure").mockResolvedValue({ loginGuard: { count: 1, level: 0 } } as never);
  jest.spyOn(adminAccountRepository, "clearLoginGuard").mockResolvedValue({} as never);
  jest.spyOn(adminAccountRepository, "findActiveById").mockImplementation(() => Promise.resolve(account.status === "active" ? { ...account } : null) as never);
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([]);
  jest.spyOn(adminEmployeeRepository, "findByEmail").mockResolvedValue({ position: "Kế toán", department: "Tài chính", avatar: "" } as never);
  jest.spyOn(authSessionRepository, "create").mockImplementation((data) => { sessions.set(data.sessionId, { ...data }); return Promise.resolve(data) as never; });
  jest.spyOn(authSessionRepository, "findActive").mockImplementation((sid, aid) => {
    const s = sessions.get(sid);
    return Promise.resolve(s && s.accountId === aid && s.expiresAt > new Date() ? { ...s } : null) as never;
  });
  jest.spyOn(authSessionRepository, "findForRefresh").mockImplementation((sid) => Promise.resolve(sessions.get(sid) ?? null) as never);
  jest.spyOn(authSessionRepository, "rotate").mockImplementation((sid, aid, version, previousHash, nextHash, nonce, time) => {
    const s = sessions.get(sid);
    if (!s || s.accountId !== aid || s.authVersion !== version || s.refreshHash !== previousHash) return Promise.resolve(null) as never;
    Object.assign(s, { refreshHash: nextHash, previousRefreshHash: previousHash, refreshNonce: nonce, refreshedAt: time });
    return Promise.resolve({ ...s }) as never;
  });
  jest.spyOn(authSessionRepository, "revoke").mockImplementation((sid) => { sessions.delete(sid); return Promise.resolve({ deletedCount: 1 }) as never; });
});
afterEach(() => jest.restoreAllMocks());
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
});

const call = (path: string, method = "GET", cookie = "", body?: object) => fetch(`${url}${path}`, {
  method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
function cookieValue(response: Response, name: string) {
  const header = response.headers.getSetCookie().find((value) => value.startsWith(`${name}=`));
  if (!header) throw new Error(`missing cookie ${name}`);
  return decodeURIComponent(header.slice(name.length + 1).split(";")[0]!);
}
const credentials = { username: account.email, password };

it("lets an admin account sign in to the user portal with user-level access only", async () => {
  const response = await call("/user/login", "POST", "", credentials);
  expect(response.status).toBe(200);
  const data = (await response.json()).data;
  expect(data).toMatchObject({ id, email: account.email, role: "user", permissions: [] });
  const access = cookieValue(response, USER_ACCESS_COOKIE);
  expect((jwt.decode(access) as jwt.JwtPayload).aud).toBe("asia-user");
  const me = await call("/user/me", "GET", `${USER_ACCESS_COOKIE}=${access}`);
  expect(me.status).toBe(200);
  const meData = (await me.json()).data;
  expect(meData.role).toBe("user");
  // The menu may show "Vào trang quản trị", but this session still has no admin rights.
  expect(meData).toMatchObject({ canAccessAdmin: true, permissions: [], position: "Kế toán", department: "Tài chính" });
});

it("does not offer the admin link to a plain user account", async () => {
  account.role = "user";
  const response = await call("/user/login", "POST", "", credentials);
  const access = cookieValue(response, USER_ACCESS_COOKIE);
  const me = await call("/user/me", "GET", `${USER_ACCESS_COOKIE}=${access}`);
  expect((await me.json()).data.canAccessAdmin).toBe(false);
});

it("rejects user-portal tokens in the admin portal, even for an admin account", async () => {
  const response = await call("/user/login", "POST", "", credentials);
  const access = cookieValue(response, USER_ACCESS_COOKIE);
  const refresh = cookieValue(response, USER_REFRESH_COOKIE);
  expect((await call("/admin/protected", "GET", `${AUTH_COOKIE_NAME}=${access}`)).status).toBe(401);
  expect((await call("/admin/refresh", "POST", `${AUTH_REFRESH_COOKIE_NAME}=${refresh}`, {})).status).toBe(401);
});

it("rejects admin-portal tokens in the user portal", async () => {
  const response = await call("/admin/login", "POST", "", credentials);
  expect(response.status).toBe(200);
  const access = cookieValue(response, AUTH_COOKIE_NAME);
  const refresh = cookieValue(response, AUTH_REFRESH_COOKIE_NAME);
  expect((await call("/admin/protected", "GET", `${AUTH_COOKIE_NAME}=${access}`)).status).toBe(200);
  expect((await call("/user/me", "GET", `${USER_ACCESS_COOKIE}=${access}`)).status).toBe(401);
  expect((await call("/user/refresh", "POST", `${USER_REFRESH_COOKIE}=${refresh}`, {})).status).toBe(401);
});

it("keeps regular users out of the admin portal but lets them use the user portal", async () => {
  account.role = "user";
  const admin = await call("/admin/login", "POST", "", credentials);
  expect(admin.status).toBe(403);
  expect(admin.headers.getSetCookie()).toEqual([]);
  expect((await call("/user/login", "POST", "", credentials)).status).toBe(200);
});

it("gives the same generic answer for a wrong password and an unknown username", async () => {
  const wrong = await call("/user/login", "POST", "", { ...credentials, password: "Wrong-password1!" });
  jest.mocked(adminAccountRepository.findByUsernameWithPassword).mockResolvedValue(null);
  const unknown = await call("/user/login", "POST", "", { username: "nobody", password });
  for (const response of [wrong, unknown]) {
    expect(response.status).toBe(401);
    expect((await response.json()).message).toBe("Tên đăng nhập hoặc mật khẩu không chính xác.");
  }
});

it("still blocks pending and deactivated accounts in the user portal", async () => {
  account.status = "pending";
  expect((await call("/user/login", "POST", "", credentials)).status).toBe(403);
  account.status = "inactive";
  expect((await call("/user/login", "POST", "", credentials)).status).toBe(403);
});
