import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { AccountRole, AuthenticatedAccount } from "../src/interfaces/account.interface";
import type { AuthSession } from "../src/interfaces/auth-session.interface";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { authSessionRepository } from "../src/repositories/admin/auth-session.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { auditLogService } from "../src/services/admin/audit-log.service";
import { adminAuthService } from "../src/services/admin/auth.service";
import { adminSessionService } from "../src/services/admin/auth-session.service";
import { describeSessionClient } from "../src/utils/account/sessionClient";
import authRouter from "../src/routes/admin/auth.route";
import { requireCsrfProtection } from "../src/middlewares/csrf.middleware";
import { globalErrorHandler } from "../src/middlewares/error.middleware";
import { AUTH_COOKIE_NAME } from "../src/config/auth.config";

const rootId = "507f1f77bcf86cd799439011", managerId = "507f1f77bcf86cd799439012", otherId = "507f1f77bcf86cd799439013";
type StoredSession = AuthSession & { _id: string };
const accounts = new Map<string, { _id: string; name: string; email: string; role: AccountRole; status: string; authVersion: number; permissionGroupIds: string[] }>();
const sessions = new Map<string, StoredSession>();
let server: Server, url: string;
const previousSecret = process.env.JWT_SECRET;
let recordSequence = 0;
function addSession(accountId: string, sid: string, extra: Partial<StoredSession> = {}) {
  const s: StoredSession = {
    _id: (++recordSequence).toString(16).padStart(24, "0"), accountId, sessionId: sid, authVersion: accounts.get(accountId)!.authVersion,
    persistent: true, expiresAt: new Date(Date.now() + 3_600_000), createdAt: new Date(), lastSeenAt: new Date(),
    browser: "Chrome", operatingSystem: "Windows", ipAddress: "192.168.26.50", lastIpAddress: "192.168.26.50",
    refreshHash: "private-refresh-hash", refreshNonce: "private-nonce", previousRefreshHash: "private-previous-hash", ...extra,
  };
  sessions.set(s._id, s); return s;
}
const token = (accountId: string, sid: string) => jwt.sign({ sub: accountId, sid, version: accounts.get(accountId)!.authVersion, tokenType: "access" }, process.env.JWT_SECRET!);
const actor = (id: string): AuthenticatedAccount => ({ id, name: accounts.get(id)!.name, email: accounts.get(id)!.email, role: accounts.get(id)!.role, permissions: [] });
const activeSessions = (accountId: string, version: number) => [...sessions.values()].filter((s) => s.accountId === accountId && s.authVersion === version && s.expiresAt > new Date());

beforeAll(async () => {
  process.env.JWT_SECRET = "session-management-tests-only";
  const app = express(); app.use(express.json(), cookieParser()); app.use("/admin", requireCsrfProtection);
  app.use("/admin/auth", authRouter); app.use(globalErrorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin/auth`;
});
beforeEach(() => {
  recordSequence = 0; sessions.clear(); accounts.clear();
  for (const [id, role] of [[rootId, "admin"], [managerId, "manager"], [otherId, "manager"]] as const) {
    accounts.set(id, { _id: id, name: role, email: `${id}@asiafnb.com`, role, status: "active", authVersion: 0, permissionGroupIds: [] });
  }
  addSession(rootId, "root-current"); addSession(managerId, "manager-current"); addSession(managerId, "manager-other"); addSession(otherId, "other-current");
  jest.spyOn(adminAccountRepository, "findActiveById").mockImplementation((id) => Promise.resolve(accounts.get(id)?.status === "active" ? accounts.get(id) : null) as never);
  jest.spyOn(adminAccountRepository, "findForSessions").mockImplementation((id) => Promise.resolve(accounts.get(id) ?? null) as never);
  jest.spyOn(adminAccountRepository, "revokeAllSessions").mockImplementation((id) => {
    const a = accounts.get(id); if (a) a.authVersion++; return Promise.resolve(a ?? null) as never;
  });
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([]);
  jest.spyOn(auditLogService, "record").mockResolvedValue();
  jest.spyOn(authSessionRepository, "findActive").mockImplementation((sid, id) => Promise.resolve([...sessions.values()].find((s) => s.sessionId === sid && s.accountId === id && s.expiresAt > new Date()) ?? null) as never);
  jest.spyOn(authSessionRepository, "touch").mockImplementation((sid, id, ip) => {
    const s = [...sessions.values()].find((s) => s.sessionId === sid && s.accountId === id);
    if (s) Object.assign(s, { lastSeenAt: new Date(), ...(ip ? { lastIpAddress: ip } : {}) });
    return Promise.resolve({ modifiedCount: s ? 1 : 0 }) as never;
  });
  jest.spyOn(authSessionRepository, "list").mockImplementation((id, version, skip, limit) => Promise.resolve(activeSessions(id, version).slice(skip, skip + limit)) as never);
  jest.spyOn(authSessionRepository, "count").mockImplementation((id, version) => Promise.resolve(activeSessions(id, version).length) as never);
  jest.spyOn(authSessionRepository, "findById").mockImplementation((id, accountId) => Promise.resolve(sessions.get(id)?.accountId === accountId ? sessions.get(id) : null) as never);
  jest.spyOn(authSessionRepository, "revokeById").mockImplementation((id, accountId) => {
    const found = sessions.get(id)?.accountId === accountId; if (found) sessions.delete(id); return Promise.resolve({ deletedCount: Number(found) }) as never;
  });
  jest.spyOn(authSessionRepository, "revokeOthers").mockImplementation((id, current) => {
    for (const s of sessions.values()) if (s.accountId === id && s.sessionId !== current) sessions.delete(s._id);
    return Promise.resolve({ deletedCount: 1 }) as never;
  });
  jest.spyOn(authSessionRepository, "revokeOlderVersions").mockImplementation((id, version) => {
    for (const s of sessions.values()) if (s.accountId === id && s.authVersion < version) sessions.delete(s._id);
    return Promise.resolve({ deletedCount: 1 }) as never;
  });
});
afterEach(() => jest.restoreAllMocks());
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
});
function call(path: string, jwtToken = token(managerId, "manager-current"), method = "GET", csrf = true) {
  return fetch(url + path, { method, headers: { ...(jwtToken ? { Cookie: `${AUTH_COOKIE_NAME}=${jwtToken}` } : {}), ...(csrf ? { "X-Requested-With": "AsiaPortal" } : {}) } });
}

it("lists only valid own sessions, marks the current one, paginates and excludes secrets", async () => {
  addSession(managerId, "expired", { expiresAt: new Date(0) }); addSession(managerId, "old-version", { authVersion: -1 });
  const response = await call("/sessions?limit=1&page=1");
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
  const data = (await response.json()).data;
  expect(data.pagination).toMatchObject({ total: 2, totalPages: 2 });
  expect(data.items).toHaveLength(1); expect(data.items[0].isCurrent).toBe(true);
  for (const field of ["sessionId", "refreshHash", "previousRefreshHash", "refreshNonce", "authVersion", "accountId"]) expect(data.items[0]).not.toHaveProperty(field);
});
it("allows a root Admin to list another account, without marking its sessions as current", async () => {
  const response = await call(`/sessions?accountId=${managerId}`, token(rootId, "root-current"));
  expect(response.status).toBe(200); const data = (await response.json()).data;
  expect(data.account.id).toBe(managerId); expect(data.items.every((s: { isCurrent: boolean }) => !s.isCurrent)).toBe(true);
});
it("does not present inactive or unapproved accounts as having usable admin sessions", async () => {
  accounts.get(managerId)!.status = "inactive";
  const result = await adminSessionService.list(actor(rootId), "root-current", { accountId: managerId });
  expect(result.items).toEqual([]); expect(result.pagination.total).toBe(0);
});
it("blocks manager attempts to list or revoke another account, even with a known session record ID", async () => {
  const foreign = [...sessions.values()].find((s) => s.accountId === otherId)!;
  for (const [path, method] of [[`/sessions?accountId=${otherId}`, "GET"], [`/sessions/${foreign._id}?accountId=${otherId}`, "DELETE"], [`/sessions?accountId=${otherId}&scope=all`, "DELETE"]]) {
    expect((await call(path!, undefined, method!)).status).toBe(403);
  }
  expect((await call(`/sessions/${foreign._id}`, undefined, "DELETE")).status).toBe(404);
  expect(sessions.has(foreign._id)).toBe(true);
});
it("rejects unauthenticated, malformed query/ID and missing-CSRF mutations", async () => {
  expect((await call("/sessions", "")).status).toBe(401);
  for (const path of ["/sessions?accountId=bad", "/sessions?page=0", "/sessions?limit=101", "/sessions?accountId[$ne]=x", "/sessions?unexpected=1"]) expect((await call(path)).status).toBe(400);
  for (const path of ["/sessions?scope=invalid", "/sessions", "/sessions/bad"]) expect((await call(path, undefined, "DELETE")).status).toBe(400);
  expect((await call("/sessions?scope=all", undefined, "DELETE", false)).status).toBe(403);
});
it("revokes a selected session and rejects its copied access token, preserving the current session", async () => {
  const other = [...sessions.values()].find((s) => s.sessionId === "manager-other")!;
  const copied = token(managerId, other.sessionId);
  const response = await call(`/sessions/${other._id}`, undefined, "DELETE");
  expect((await response.json()).data.signedOut).toBe(false);
  expect((await call("/me", copied)).status).toBe(401);
  expect((await call("/me")).status).toBe(200);
  expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "session.revoked", entityId: managerId }));
});
it("revokes other sessions but keeps the current session and unrelated accounts", async () => {
  const copied = token(managerId, "manager-other");
  expect((await call("/sessions?scope=others", undefined, "DELETE")).status).toBe(200);
  expect((await call("/me", copied)).status).toBe(401); expect((await call("/me")).status).toBe(200);
  expect((await call("/me", token(otherId, "other-current"))).status).toBe(200);
  expect(adminAccountRepository.revokeAllSessions).not.toHaveBeenCalled();
});
it("revoking the current session clears both cookies and returns signedOut", async () => {
  const current = [...sessions.values()].find((s) => s.sessionId === "manager-current")!;
  const response = await call(`/sessions/${current._id}`, undefined, "DELETE");
  expect((await response.json()).data.signedOut).toBe(true);
  expect(response.headers.getSetCookie()).toHaveLength(2);
});
it("revokes all versions atomically and preserves a new concurrent login", async () => {
  const old = token(managerId, "manager-current");
  jest.mocked(adminAccountRepository.revokeAllSessions).mockImplementation((id) => {
    const a = accounts.get(id)!; a.authVersion++; addSession(id, "fresh-concurrent-login"); return Promise.resolve(a) as never;
  });
  const response = await call("/sessions?scope=all", old, "DELETE");
  expect((await response.json()).data.signedOut).toBe(true);
  expect((await call("/me", old)).status).toBe(401);
  expect((await call("/me", token(managerId, "fresh-concurrent-login"))).status).toBe(200);
});
it("lets root Admin revoke another account without logging out the root Admin", async () => {
  const copied = token(managerId, "manager-current");
  const root = token(rootId, "root-current");
  const response = await call(`/sessions?accountId=${managerId}&scope=all`, root, "DELETE");
  expect((await response.json()).data.signedOut).toBe(false);
  expect((await call("/me", copied)).status).toBe(401); expect((await call("/me", root)).status).toBe(200);
});
it("throttles last activity updates and uses the server-observed IP rather than body parameters", async () => {
  await call("/me"); expect(authSessionRepository.touch).not.toHaveBeenCalled();
  [...sessions.values()].find((s) => s.sessionId === "manager-current")!.lastSeenAt = new Date(Date.now() - 61_000);
  await call("/me");
  expect(authSessionRepository.touch).toHaveBeenCalledWith("manager-current", managerId, "127.0.0.1");
});
it("handles old sessions without device metadata without inventing a device or location", async () => {
  const current = [...sessions.values()].find((s) => s.sessionId === "manager-current")!;
  delete current.browser; delete current.operatingSystem; delete current.ipAddress; delete current.lastIpAddress; delete current.lastSeenAt;
  const result = await adminSessionService.list(actor(managerId), "manager-current", {});
  expect(result.items[0]).toMatchObject({ browser: "Chưa xác định", operatingSystem: "Chưa xác định", ipAddress: null });
});
it("records device/IP hints during login without trusting invalid IP values", async () => {
  jest.spyOn(adminAccountRepository, "findByEmailWithPassword").mockResolvedValue({ ...accounts.get(managerId), password: "$2b$04$fixture" } as never);
  const bcrypt = (await import("bcryptjs")).default;
  jest.spyOn(bcrypt, "compare").mockImplementation(async () => true);
  const create = jest.spyOn(authSessionRepository, "create").mockResolvedValue({} as never);
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0";
  await adminAuthService.login({ email: "test@asiafnb.com", password: "Password123!" }, { ipAddress: "::ffff:192.168.26.50", userAgent: ua });
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ browser: "Microsoft Edge", operatingSystem: "Windows", ipAddress: "192.168.26.50", lastSeenAt: expect.any(Date) }));
  expect(describeSessionClient({ ipAddress: "forged-header", userAgent: "unknown" })).toMatchObject({ ipAddress: undefined, browser: "Chưa xác định" });
});
