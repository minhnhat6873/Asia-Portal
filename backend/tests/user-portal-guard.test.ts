import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import routes from "../src/routes/index.route";
import { globalErrorHandler } from "../src/middlewares/error.middleware";
import { AUTH_COOKIE_NAME } from "../src/config/auth.config";
import { USER_ACCESS_COOKIE } from "../src/controllers/user/auth.controller";

// Internal data must be refused by the API itself, not only hidden by the website:
// a guest (or an admin-portal token) gets 401 before any database work happens.
let server: Server, url: string;
const previousSecret = process.env.JWT_SECRET;
const secret = "user-portal-guard-test-only-secret";
const subject = "507f1f77bcf86cd799439012";

beforeAll(async () => {
  process.env.JWT_SECRET = secret;
  const app = express();
  app.use(express.json(), cookieParser(), routes, globalErrorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
});

const protectedRequests: [string, string][] = [
  ["GET", "/user/employees"],
  ["GET", "/user/employees/departments"],
  ["GET", "/user/employees/507f1f77bcf86cd799439011"],
  ["GET", "/user/meetings"],
  ["GET", "/user/meetings/mine"],
  ["POST", "/user/meetings/bookings"],
  ["POST", "/user/meetings/bookings/507f1f77bcf86cd799439011/cancel"],
  ["POST", "/user/feedback"],
  ["GET", "/user/account/profile"],
  ["POST", "/user/account/change-password"],
  ["POST", "/user/account/logout-others"],
  ["POST", "/user/account/avatar"],
  ["DELETE", "/user/account/avatar"],
  ["GET", "/user/vehicles/mine"],
  ["POST", "/user/vehicles"],
  ["PATCH", "/user/vehicles/507f1f77bcf86cd799439011"],
  ["POST", "/user/vehicles/507f1f77bcf86cd799439011/cancel"],
  ["POST", "/user/vehicles/507f1f77bcf86cd799439011/arrived"],
  ["GET", "/user/notifications"],
  ["DELETE", "/user/notifications"],
  ["GET", "/user/notifications/unread-count"],
  ["POST", "/user/notifications/read-all"],
  ["POST", "/user/notifications/507f1f77bcf86cd799439011/read"],
];

const send = (method: string, path: string, cookie = "") => fetch(`${url}${path}`, {
  method,
  headers: { "Content-Type": "application/json", "X-Requested-With": "AsiaPortal", ...(cookie ? { Cookie: cookie } : {}) },
  ...(method === "GET" ? {} : { body: "{}" }),
});

it.each(protectedRequests)("%s %s refuses guests", async (method, path) => {
  const response = await send(method, path);
  expect(response.status).toBe(401);
  expect((await response.json()).success).toBe(false);
});

it.each(protectedRequests)("%s %s refuses an admin-portal token", async (method, path) => {
  const adminToken = jwt.sign({ tokenType: "access", sid: "s1", version: 0 }, secret, { subject, expiresIn: "15m", algorithm: "HS256" });
  // Sent under the admin cookie name, and also smuggled into the user cookie.
  expect((await send(method, path, `${AUTH_COOKIE_NAME}=${adminToken}`)).status).toBe(401);
  expect((await send(method, path, `${USER_ACCESS_COOKIE}=${adminToken}`)).status).toBe(401);
});

it("refuses an expired or forged user token", async () => {
  const expired = jwt.sign({ tokenType: "access", sid: "s1", version: 0, aud: "asia-user" }, secret, { subject, expiresIn: -10, algorithm: "HS256" });
  const forged = jwt.sign({ tokenType: "access", sid: "s1", version: 0, aud: "asia-user" }, "another-secret", { subject, expiresIn: "15m", algorithm: "HS256" });
  for (const token of [expired, forged, "not-a-jwt"]) {
    expect((await send("GET", "/user/employees", `${USER_ACCESS_COOKIE}=${token}`)).status).toBe(401);
  }
});
