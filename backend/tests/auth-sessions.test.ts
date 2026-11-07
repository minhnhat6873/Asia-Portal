import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { adminAuthService } from "../src/services/admin/auth.service";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { authSessionRepository } from "../src/repositories/admin/auth-session.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { requireAdminAuth } from "../src/middlewares/auth.middleware";
import { requireCsrfProtection } from "../src/middlewares/csrf.middleware";
import { allowedCorsOrigins } from "../src/config/security.config";
import { login, logout, refreshLogin, getCurrentAccount } from "../src/controllers/admin/auth.controller";
import { globalErrorHandler } from "../src/middlewares/error.middleware";
import { AUTH_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME } from "../src/config/auth.config";
import type { AuthSession } from "../src/interfaces/auth-session.interface";
import AccountModel from "../src/models/account.model";
import type { ClientSession } from "mongoose";
import mongoose from "mongoose";

const id = "507f1f77bcf86cd799439012";
const password = "Test-password123!";
const account = { _id: id, name: "Test", email: "test@asiafnb.com", role: "admin", status: "active", password: "", authVersion: 0, permissionGroupIds: [] };
const sessions = new Map<string, AuthSession>();
let server: Server, url: string;
const previousSecret = process.env.JWT_SECRET;

beforeAll(async () => {
  process.env.JWT_SECRET = "auth-sessions-test-only-secret";
  account.password = await bcrypt.hash(password, 4);
  const app = express();
  app.use(express.json(), cookieParser(), requireCsrfProtection);
  app.post("/login", login); app.post("/refresh", refreshLogin); app.post("/logout", logout);
  app.get("/me", requireAdminAuth, getCurrentAccount);
  app.post("/protected", requireAdminAuth, (_req, res) => res.json({ success: true }));
  app.use(globalErrorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
beforeEach(() => {
  account.authVersion = 0; account.status = "active"; sessions.clear();
  jest.spyOn(adminAccountRepository, "findByEmailWithPassword").mockResolvedValue(account as never);
  jest.spyOn(adminAccountRepository, "findActiveById").mockImplementation(() => Promise.resolve(account.status === "active" ? account : null) as never);
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([]);
  jest.spyOn(authSessionRepository, "create").mockImplementation((data) => { sessions.set(data.sessionId, { ...data }); return Promise.resolve(data) as never; });
  jest.spyOn(authSessionRepository, "findActive").mockImplementation((sid, aid) => {
    const s = sessions.get(sid);
    return Promise.resolve(s && s.accountId === aid && s.expiresAt > new Date() ? { ...s } : null) as never;
  });
  jest.spyOn(authSessionRepository, "findForRefresh").mockImplementation((sid) => Promise.resolve(sessions.get(sid) ?? null) as never);
  jest.spyOn(authSessionRepository, "rotate").mockImplementation((sid, aid, version, previousHash, nextHash, nonce, time) => {
    const s = sessions.get(sid);
    if (!s || s.accountId !== aid || s.authVersion !== version || s.refreshHash !== previousHash || s.expiresAt <= new Date()) return Promise.resolve(null) as never;
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

const call = (path: string, method = "GET", cookie = "", body?: object, headers: Record<string, string> = {}) => fetch(`${url}${path}`, {
  method, headers: { "Content-Type": "application/json", "X-Requested-With": "AsiaPortal", ...(cookie ? { Cookie: cookie } : {}), ...headers },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const accessCookie = (token: string) => `${AUTH_COOKIE_NAME}=${token}`;
const refreshCookie = (token: string) => `${AUTH_REFRESH_COOKIE_NAME}=${token}`;
const signIn = (rememberMe = true) => adminAuthService.login({ email: account.email, password, rememberMe });

it("stores only hashed refresh credentials, issues 15-minute access tokens, and excludes secrets from me", async () => {
  const session = await signIn();
  const payload = jwt.decode(session.token) as jwt.JwtPayload;
  expect(payload.exp! - payload.iat!).toBe(900);
  expect([...sessions.values()][0]!.refreshHash).toBe(createHash("sha256").update(session.refreshToken).digest("hex"));
  const response = await call("/me", "GET", accessCookie(session.token));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const data = (await response.json()).data;
  expect(data).not.toHaveProperty("authVersion"); expect(data).not.toHaveProperty("password");
});
it.each(["account", "session", "permissions"])("fails closed with 503 during a %s lookup outage, then recovers with the same cookies", async (stage) => {
  const session = await signIn();
  const error = new mongoose.mongo.MongoNetworkError("private database address and credentials must not leak");
  if (stage === "account") jest.mocked(adminAccountRepository.findActiveById).mockRejectedValueOnce(error);
  else if (stage === "session") jest.mocked(authSessionRepository.findActive).mockRejectedValueOnce(error);
  else jest.mocked(permissionGroupRepository.findActiveByIds).mockRejectedValueOnce(error);
  const response = await call("/me", "GET", accessCookie(session.token));
  expect(response.status).toBe(503);
  expect(response.headers.getSetCookie()).toEqual([]);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body).not.toHaveProperty("data");
  expect(JSON.stringify(body)).not.toContain("private database");
  expect(authSessionRepository.revoke).not.toHaveBeenCalled();
  expect((await call("/me", "GET", accessCookie(session.token))).status).toBe(200);
});
it.each(["account", "session", "rotation"])("preserves refresh credentials when the %s operation is unavailable", async (stage) => {
  const session = await signIn();
  const error = new mongoose.Error.MongooseServerSelectionError("database unavailable");
  if (stage === "account") jest.mocked(adminAccountRepository.findActiveById).mockRejectedValueOnce(error);
  else if (stage === "session") jest.mocked(authSessionRepository.findActive).mockRejectedValueOnce(error);
  else jest.mocked(authSessionRepository.rotate).mockRejectedValueOnce(error);
  const failed = await call("/refresh", "POST", refreshCookie(session.refreshToken), {});
  expect(failed.status).toBe(503);
  expect(failed.headers.getSetCookie()).toEqual([]);
  expect(authSessionRepository.revoke).not.toHaveBeenCalled();
  expect((await call("/refresh", "POST", refreshCookie(session.refreshToken), {})).status).toBe(200);
});
it("does not clear cookies when logout cannot revoke the session", async () => {
  const session = await signIn();
  jest.mocked(authSessionRepository.revoke).mockRejectedValueOnce(new mongoose.mongo.MongoNetworkError("unavailable"));
  const failed = await call("/logout", "POST", accessCookie(session.token), {});
  expect(failed.status).toBe(503);
  expect(failed.headers.getSetCookie()).toEqual([]);
  expect((await call("/logout", "POST", accessCookie(session.token), {})).status).toBe(200);
  expect((await call("/me", "GET", accessCookie(session.token))).status).toBe(401);
});
it("returns 503 for login database failures without issuing credentials", async () => {
  jest.mocked(adminAccountRepository.findByEmailWithPassword).mockRejectedValueOnce(new mongoose.mongo.MongoNetworkError("unavailable"));
  const failed = await call("/login", "POST", "", { email: account.email, password });
  expect(failed.status).toBe(503);
  expect(failed.headers.getSetCookie()).toEqual([]);
  expect(authSessionRepository.create).not.toHaveBeenCalled();
});
it("still rejects tampered credentials before querying an unavailable database", async () => {
  const session = await signIn();
  jest.mocked(adminAccountRepository.findActiveById).mockClear().mockRejectedValue(new mongoose.mongo.MongoNetworkError("unavailable"));
  expect((await call("/me", "GET", accessCookie(session.token + "broken"))).status).toBe(401);
  expect((await call("/refresh", "POST", refreshCookie(session.refreshToken + "broken"), {})).status).toBe(401);
  expect(adminAccountRepository.findActiveById).not.toHaveBeenCalled();
});
it("does not misclassify unexpected server errors as invalid sessions", async () => {
  const session = await signIn();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.mocked(adminAccountRepository.findActiveById).mockRejectedValueOnce(new Error("internal failure"));
  const failed = await call("/me", "GET", accessCookie(session.token));
  expect(failed.status).toBe(500);
  expect(failed.headers.getSetCookie()).toEqual([]);
  expect(JSON.stringify(await failed.json())).not.toContain("internal failure");
});
it.each([
  new mongoose.mongo.MongoNotConnectedError("unavailable"),
  new mongoose.mongo.MongoTopologyClosedError(),
  new mongoose.mongo.MongoServerClosedError(),
  new mongoose.Error("Operation `admins.findOne()` buffering timed out after 10000ms"),
])("classifies disconnected or buffered database operations as unavailable ($name)", async (error) => {
  const session = await signIn();
  jest.mocked(adminAccountRepository.findActiveById).mockRejectedValueOnce(error);
  const failed = await call("/me", "GET", accessCookie(session.token));
  expect(failed.status).toBe(503);
  expect(failed.headers.getSetCookie()).toEqual([]);
});
it("reports missing signing configuration as a server error without deleting credentials", async () => {
  const session = await signIn();
  const secret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    const anonymous = await call("/me");
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.getSetCookie()).toEqual([]);
    for (const [path, method, cookie] of [
      ["/me", "GET", accessCookie(session.token)],
      ["/refresh", "POST", refreshCookie(session.refreshToken)],
    ]) {
      const failed = await call(path!, method!, cookie!, method === "POST" ? {} : undefined);
      expect(failed.status).toBe(500);
      expect(failed.headers.getSetCookie()).toEqual([]);
    }
  } finally { process.env.JWT_SECRET = secret; }
});
it("logout revokes the copied access AND refresh tokens while preserving other device sessions", async () => {
  const first = await signIn(), second = await signIn();
  expect((await call("/logout", "POST", accessCookie(first.token), {})).status).toBe(200);
  expect((await call("/me", "GET", accessCookie(first.token))).status).toBe(401);
  expect((await call("/refresh", "POST", refreshCookie(first.refreshToken), {})).status).toBe(401);
  expect((await call("/me", "GET", accessCookie(second.token))).status).toBe(200);
});
it("logout works with only a refresh cookie or expired signed access token", async () => {
  const first = await signIn();
  expect((await call("/logout", "POST", refreshCookie(first.refreshToken), {})).status).toBe(200);
  expect((await call("/me", "GET", accessCookie(first.token))).status).toBe(401);
  const next = await signIn();
  const claims = jwt.decode(next.token) as jwt.JwtPayload;
  const expired = jwt.sign({ sub: id, sid: claims.sid, tokenType: "access", version: 0, exp: 1 }, process.env.JWT_SECRET!);
  expect((await call("/logout", "POST", accessCookie(expired), {})).status).toBe(200);
  expect((await call("/me", "GET", accessCookie(next.token))).status).toBe(401);
});
it("rotates refresh tokens without extending absolute expiry and permits simultaneous tabs to receive the same successor", async () => {
  const first = await signIn();
  const [a, b] = await Promise.all([adminAuthService.refresh(first.refreshToken), adminAuthService.refresh(first.refreshToken)]);
  expect(a.refreshToken).not.toBe(first.refreshToken); expect(a.refreshToken).toBe(b.refreshToken);
  expect((jwt.decode(a.refreshToken) as jwt.JwtPayload).exp).toBe((jwt.decode(first.refreshToken) as jwt.JwtPayload).exp);
  expect((await call("/me", "GET", accessCookie(a.token))).status).toBe(200);
});
it("detects replay outside the five-second retry window and revokes the session including its latest access token", async () => {
  const first = await signIn(), next = await adminAuthService.refresh(first.refreshToken);
  const stored = [...sessions.values()][0]!; stored.refreshedAt! -= 6;
  await expect(adminAuthService.refresh(first.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  expect((await call("/me", "GET", accessCookie(next.token))).status).toBe(401);
  await expect(adminAuthService.refresh(next.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
});
it("password-version changes invalidate every previous session, but allow a fresh login", async () => {
  const first = await signIn(), second = await signIn();
  account.authVersion += 1;
  for (const s of [first, second]) {
    expect((await call("/me", "GET", accessCookie(s.token))).status).toBe(401);
    await expect(adminAuthService.refresh(s.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  }
  const fresh = await signIn(); expect((await call("/me", "GET", accessCookie(fresh.token))).status).toBe(200);
});
it.each(["self-change", "managed-reset", "forgotten-reset"])("%s atomically changes the password and invalidates existing tokens", async (kind) => {
  const s = await signIn();
  jest.spyOn(AccountModel, "findOneAndUpdate").mockImplementation((...args: unknown[]) => {
    const update = args[1] as { $inc?: { authVersion?: number }; $set?: { password?: string } };
    expect(update.$inc?.authVersion).toBe(1);
    expect(update.$set?.password).toBe("new-hash");
    account.authVersion += update.$inc!.authVersion!;
    return { lean: () => Promise.resolve(account) } as never;
  });
  if (kind === "self-change") await adminAccountRepository.changePasswordIfUnchanged(id, account.email, "old-hash", "new-hash", {} as ClientSession);
  else if (kind === "managed-reset") await adminAccountRepository.resetManagedPassword(id, "new-hash", {} as ClientSession);
  else await adminAccountRepository.resetPassword(id, "new-hash");
  expect((await call("/me", "GET", accessCookie(s.token))).status).toBe(401);
  await expect(adminAuthService.refresh(s.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
});
it("rejects legacy, tampered, wrong-type, expired and missing-server-session tokens", async () => {
  const s = await signIn();
  const legacy = jwt.sign({ sub: id, tokenType: "access" }, process.env.JWT_SECRET!);
  const expired = jwt.sign({ sub: id, sid: "missing", version: 0, tokenType: "access", exp: 1 }, process.env.JWT_SECRET!);
  for (const token of [legacy, expired, s.refreshToken, s.token + "broken"]) {
    expect((await call("/me", "GET", accessCookie(token))).status).toBe(401);
  }
  sessions.clear(); expect((await call("/me", "GET", accessCookie(s.token))).status).toBe(401);
});
it("enforces absolute session expiry independently of TTL cleanup and checks account lock", async () => {
  const s = await signIn(); [...sessions.values()][0]!.expiresAt = new Date(0);
  expect((await call("/me", "GET", accessCookie(s.token))).status).toBe(401);
  await expect(adminAuthService.refresh(s.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  const active = await signIn(); account.status = "inactive";
  expect((await call("/me", "GET", accessCookie(active.token))).status).toBe(401);
});
it.each([true, false])("sets correct persistent/session cookies when rememberMe=%s and rotates both cookies", async (rememberMe) => {
  const response = await call("/login", "POST", "", { email: account.email, password, rememberMe });
  expect(response.status).toBe(200);
  const cookies = response.headers.getSetCookie(); expect(cookies).toHaveLength(2);
  for (const cookie of cookies) {
    expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("SameSite=Lax");
    expect(cookie.includes("Max-Age=")).toBe(rememberMe);
  }
  const cookie = cookies.map((c) => c.split(";")[0]).join("; ");
  const refresh = await call("/refresh", "POST", cookie, {});
  expect(refresh.status).toBe(200); expect(refresh.headers.getSetCookie()).toHaveLength(2);
  for (const c of refresh.headers.getSetCookie()) expect(c.includes("Max-Age=")).toBe(rememberMe);
});
it("rejects forged forms and foreign/null origins, including requests without Origin and without the custom header", async () => {
  const s = await signIn();
  const cases: Record<string, string>[] = [ { "X-Requested-With": "" }, { Origin: "https://evil.example" }, { Origin: "null" }, { Referer: "https://evil.example/form" } ];
  for (const extra of cases) {
    const response = await call("/protected", "POST", accessCookie(s.token), {}, extra);
    expect(response.status).toBe(403);
  }
  expect((await call("/protected", "POST", accessCookie(s.token), {})).status).toBe(200);
  const origin = allowedCorsOrigins[0];
  if (origin) expect((await call("/protected", "POST", accessCookie(s.token), {}, { Origin: origin })).status).toBe(200);
});
