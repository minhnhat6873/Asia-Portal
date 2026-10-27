import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import routes from "../src/routes/index.route";
import { globalErrorHandler } from "../src/middlewares/error.middleware";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { siteSettingsRepository } from "../src/repositories/site-settings.repository";
import { auditLogService } from "../src/services/admin/audit-log.service";
import { AUTH_COOKIE_NAME } from "../src/config/auth.config";

jest.mock("../src/repositories/site-settings.repository", () => ({ siteSettingsRepository: { get: jest.fn(), setInternalSystemsEnabled: jest.fn() } }));

describe("site navigation settings authorization and persistence", () => {
  const id = "507f1f77bcf86cd799439011";
  let server: Server;
  let url: string;
  let token: string;
  let role: "admin" | "manager" = "admin";
  let active = true;
  let stored: { internalSystemsEnabled: boolean } | null = null;
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = "site-settings-http-test-secret";
    token = jwt.sign({ sub: id, role: "admin", tokenType: "access" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    jest.spyOn(adminAccountRepository, "findActiveById").mockImplementation(() => (active ? { _id: id, name: "QA Admin", email: "qa@asiafnb.com", role, status: "active", permissionGroupIds: [] } : null) as never);
    jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([{ actions: ["dashboard:view"] }] as never);
    jest.spyOn(auditLogService, "record").mockResolvedValue();
    const app = express();
    app.use(express.json()); app.use(cookieParser()); app.use(routes); app.use(globalErrorHandler);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.on("listening", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(() => {
    role = "admin"; active = true; stored = null;
    jest.clearAllMocks();
    jest.mocked(siteSettingsRepository.get).mockImplementation(() => stored as never);
    jest.mocked(siteSettingsRepository.setInternalSystemsEnabled).mockImplementation((value) => { stored = { internalSystemsEnabled: value }; return stored as never; });
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    jest.restoreAllMocks();
    if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
  });
  const call = (path = "/admin/site-settings", method = "GET", body?: unknown, authenticated = true) => fetch(`${url}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(authenticated ? { Cookie: `${AUTH_COOKIE_NAME}=${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  it("defaults to hidden without creating a database record and whitelists public data", async () => {
    const response = await call("/user/site-settings", "GET", undefined, false);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).data).toEqual({ internalSystemsEnabled: false });
    expect(siteSettingsRepository.setInternalSystemsEnabled).not.toHaveBeenCalled();
    jest.mocked(siteSettingsRepository.get).mockResolvedValue({ internalSystemsEnabled: true, updatedBy: "private", email: "private@example.com" } as never);
    expect((await (await call("/user/site-settings", "GET", undefined, false)).json()).data).toEqual({ internalSystemsEnabled: true });
  });
  it("requires login and the current database role rather than a forged token role", async () => {
    expect((await call(undefined, "PATCH", { internalSystemsEnabled: true }, false)).status).toBe(401);
    role = "manager";
    expect((await call()).status).toBe(403);
    expect((await call(undefined, "PATCH", { internalSystemsEnabled: true })).status).toBe(403);
    expect(siteSettingsRepository.setInternalSystemsEnabled).not.toHaveBeenCalled();
    active = false;
    expect((await call(undefined, "PATCH", { internalSystemsEnabled: true })).status).toBe(401);
  });
  it.each([{}, { internalSystemsEnabled: "false" }, { internalSystemsEnabled: 1 }, { internalSystemsEnabled: null }, { internalSystemsEnabled: { $ne: false } }, { internalSystemsEnabled: true, role: "admin" }])("rejects malformed or extra fields: %o", async (body) => {
    expect((await call(undefined, "PATCH", body)).status).toBe(400);
    expect(siteSettingsRepository.setInternalSystemsEnabled).not.toHaveBeenCalled();
  });
  it("persists explicit on/off values visible to anonymous visitors and audits the authenticated actor", async () => {
    for (const value of [true, false]) {
      const updated = await call(undefined, "PATCH", { internalSystemsEnabled: value });
      expect(updated.status).toBe(200);
      expect((await updated.json()).data).toEqual({ internalSystemsEnabled: value });
      expect((await (await call("/user/site-settings", "GET", undefined, false)).json()).data).toEqual({ internalSystemsEnabled: value });
    }
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "site_settings.updated", actor: { accountId: id, name: "QA Admin", email: "qa@asiafnb.com" }, metadata: { after: { internalSystemsEnabled: false } } }));
  });
  it("exposes no public write endpoint", async () => {
    expect((await call("/user/site-settings", "PATCH", { internalSystemsEnabled: true }, false)).status).toBe(404);
    expect(siteSettingsRepository.setInternalSystemsEnabled).not.toHaveBeenCalled();
  });
});
