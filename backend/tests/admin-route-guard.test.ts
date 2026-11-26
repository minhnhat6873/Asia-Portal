import express, { Router, type RequestHandler } from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { authSessionRepository } from "../src/repositories/admin/auth-session.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { requireAdminAuth } from "../src/middlewares/auth.middleware";
import { globalErrorHandler } from "../src/middlewares/error.middleware";
import { AUTH_COOKIE_NAME } from "../src/config/auth.config";

// Every /admin API (except /admin/auth) must sit behind the shared requireAdminAuth gate.
// This test discovers all routes from the real router tree, so a new admin route mounted
// above the gate fails CI even though nobody remembered to add it here.

type Endpoint = { method: string; path: string };
type RouterProto = Record<string, (...args: unknown[]) => unknown>;
const proto = (Router as unknown as { prototype: RouterProto }).prototype;
const originalUse = proto.use!, originalRoute = proto.route!;
const mounts = new Map<unknown, { path: string; handles: unknown[] }[]>();
const routes = new Map<unknown, { path: string; route: { methods: Record<string, boolean> } }[]>();
const remember = <T>(map: Map<unknown, T[]>, key: unknown, value: T) => map.set(key, [...(map.get(key) ?? []), value]);

// Record registrations while the route modules load: Express 5 layers keep no path string.
function startRecording() {
  proto.use = function (this: unknown, ...args: unknown[]) {
    let first = args[0];
    while (Array.isArray(first) && first.length) first = first[0];
    const hasPath = typeof first !== "function";
    remember(mounts, this, { path: hasPath ? String(args[0]) : "/", handles: (hasPath ? args.slice(1) : args).flat(Infinity) });
    return originalUse.apply(this, args);
  };
  proto.route = function (this: unknown, path: unknown) {
    const route = originalRoute.call(this, path) as { methods: Record<string, boolean> };
    remember(routes, this, { path: String(path), route });
    return route;
  };
}
function stopRecording() { proto.use = originalUse; proto.route = originalRoute; }

const join = (prefix: string, path: string) => `${prefix}/${path}`.replace(/\/+/g, "/").replace(/(.)\/$/, "$1");
function listEndpoints(router: unknown, prefix = ""): Endpoint[] {
  const own = (routes.get(router) ?? []).flatMap(({ path, route }) =>
    Object.keys(route.methods).map((method) => ({ method: method === "_all" ? "get" : method, path: join(prefix, path) })));
  const nested = (mounts.get(router) ?? []).flatMap(({ path, handles }) =>
    handles.filter((handle) => mounts.has(handle) || routes.has(handle)).flatMap((child) => listEndpoints(child, join(prefix, path))));
  return [...own, ...nested];
}
// Turn route patterns into concrete URLs: params become a valid ObjectId.
const concrete = (path: string) => path.replace(/[{}]/g, "").replace(/:\w+/g, "507f1f77bcf86cd799439099").replace(/\*\w+/g, "x");
const isAdminApi = ({ path }: Endpoint) => /^\/admin(\/|$)/.test(path) && !/^\/admin\/auth(\/|$)/.test(path);

const adminId = "507f1f77bcf86cd799439012", userId = "507f1f77bcf86cd799439013";
const accounts: Record<string, object> = {
  [adminId]: { _id: adminId, name: "Admin", email: "admin@asiafnb.com", role: "admin", status: "active", authVersion: 0, permissionGroupIds: [] },
  [userId]: { _id: userId, name: "User", email: "user@asiafnb.com", role: "user", status: "active", authVersion: 0, permissionGroupIds: [] },
};
const previousSecret = process.env.JWT_SECRET, previousBuffer = mongoose.get("bufferCommands");
const token = (subject: string, audience?: string) => jwt.sign(
  { tokenType: "access", sid: `sid-${subject}`, version: 0, ...(audience ? { aud: audience } : {}) },
  process.env.JWT_SECRET!, { subject, expiresIn: "15m", algorithm: "HS256" });

let server: Server, url: string, endpoints: Endpoint[];
async function listen(router: RequestHandler) {
  const app = express();
  app.use(express.json(), cookieParser(), router, globalErrorHandler);
  const instance = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => instance.on("listening", resolve));
  return { instance, base: `http://127.0.0.1:${(instance.address() as AddressInfo).port}` };
}
const request = (base: string, { method, path }: Endpoint, cookie?: string) => fetch(base + concrete(path), {
  method: method.toUpperCase(),
  headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: `${AUTH_COOKIE_NAME}=${cookie}` } : {}) },
  ...(method === "get" || method === "head" ? {} : { body: "{}" }),
});

beforeAll(async () => {
  process.env.JWT_SECRET = "admin-route-guard-test-only-secret";
  // A request that slips past the gate must fail fast instead of waiting for a database.
  mongoose.set("bufferCommands", false);
  startRecording();
  let routerTree: RequestHandler;
  // Load the routes only now, while registrations are being recorded.
  try { routerTree = jest.requireActual<{ default: RequestHandler }>("../src/routes/index.route").default; } finally { stopRecording(); }
  endpoints = listEndpoints(routerTree).filter(isAdminApi);
  ({ instance: server, base: url } = await listen(routerTree));
});
beforeEach(() => {
  jest.spyOn(adminAccountRepository, "findActiveById").mockImplementation((id) => Promise.resolve(accounts[String(id)] ?? null) as never);
  jest.spyOn(authSessionRepository, "findActive").mockImplementation((sid, accountId) => Promise.resolve(sid === `sid-${accountId}`
    ? { sessionId: sid, accountId, authVersion: 0, expiresAt: new Date(Date.now() + 60_000), lastSeenAt: new Date() } : null) as never);
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([]);
});
afterEach(() => jest.restoreAllMocks());
afterAll(async () => {
  stopRecording();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mongoose.set("bufferCommands", previousBuffer);
  if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
});

it("discovers the admin API from the real router tree", () => {
  const found = endpoints.map(({ method, path }) => `${method.toUpperCase()} ${path}`);
  expect(found.length).toBeGreaterThan(20);
  for (const known of ["GET /admin/employees", "DELETE /admin/employees/:id/permanent", "GET /admin/accounts", "GET /admin/audit-logs"]) {
    expect(found).toContain(known);
  }
  expect(found.some((entry) => entry.includes("/admin/auth"))).toBe(false);
});

it("rejects every admin API without a session", async () => {
  for (const endpoint of endpoints) {
    expect({ ...endpoint, status: (await request(url, endpoint)).status }).toEqual({ ...endpoint, status: 401 });
  }
});

it("rejects every admin API with a user-portal token, even for an admin account", async () => {
  const userPortal = token(adminId, "asia-user");
  for (const endpoint of endpoints) {
    expect({ ...endpoint, status: (await request(url, endpoint, userPortal)).status }).toEqual({ ...endpoint, status: 401 });
  }
});

it("rejects every admin API for an account with the user role", async () => {
  const regularUser = token(userId);
  for (const endpoint of endpoints) {
    expect({ ...endpoint, status: (await request(url, endpoint, regularUser)).status }).toEqual({ ...endpoint, status: 403 });
  }
});

it("would catch an admin route mounted above the gate", async () => {
  // Self-check: the same discovery and probe must flag a route that bypasses the gate.
  startRecording();
  const leaky = Router(), leakyAdmin = Router();
  try {
    leakyAdmin.get("/report", (_req, res) => { res.json({ success: true }); });
    leaky.use("/admin/leak", leakyAdmin);
    leaky.use("/admin", requireAdminAuth);
  } finally { stopRecording(); }
  const found = listEndpoints(leaky).filter(isAdminApi);
  expect(found).toEqual([{ method: "get", path: "/admin/leak/report" }]);
  const { instance, base } = await listen(leaky);
  try { expect((await request(base, found[0]!)).status).toBe(200); }
  finally { await new Promise<void>((resolve) => instance.close(() => resolve())); }
});
