import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import userAuthRouter from "../src/routes/user/auth.route";
import { getPublicSiteSettings } from "../src/controllers/user/site-settings.controller";
import { siteSettingsService } from "../src/services/site-settings.service";
import { globalErrorHandler } from "../src/middlewares/error.middleware";

// Self-registration is off unless USER_REGISTRATION_ENABLED=true: the API answers 404 and
// the public settings tell the frontend to hide the link.
let server: Server, url: string;
const previous = process.env.USER_REGISTRATION_ENABLED;

beforeAll(async () => {
  const app = express();
  app.use(express.json(), cookieParser());
  app.use("/user/auth", userAuthRouter);
  app.get("/user/site-settings", getPublicSiteSettings);
  app.use(globalErrorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
beforeEach(() => { jest.spyOn(siteSettingsService, "get").mockResolvedValue({ internalSystemsEnabled: false }); });
afterEach(() => {
  jest.restoreAllMocks();
  if (previous === undefined) delete process.env.USER_REGISTRATION_ENABLED; else process.env.USER_REGISTRATION_ENABLED = previous;
});
afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });

const post = (path: string) => fetch(`${url}/user/auth${path}`, {
  method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "AsiaPortal" }, body: "{}",
});
const registrationPaths = ["/register", "/register/verify-otp", "/register/resend-otp"];

it.each([undefined, "", "false", "no"])("hides registration when the switch is %j", async (value) => {
  if (value === undefined) delete process.env.USER_REGISTRATION_ENABLED; else process.env.USER_REGISTRATION_ENABLED = value;
  for (const path of registrationPaths) expect((await post(path)).status).toBe(404);
  expect((await (await fetch(`${url}/user/site-settings`)).json()).data.userRegistrationEnabled).toBe(false);
});

it("opens registration when the switch is true", async () => {
  process.env.USER_REGISTRATION_ENABLED = "true";
  // An empty body now reaches validation instead of the 404.
  for (const path of registrationPaths) expect((await post(path)).status).toBe(400);
  expect((await (await fetch(`${url}/user/site-settings`)).json()).data.userRegistrationEnabled).toBe(true);
});

it("keeps login and password recovery available while registration is off", async () => {
  delete process.env.USER_REGISTRATION_ENABLED;
  for (const path of ["/login", "/forgot-password"]) expect((await post(path)).status).toBe(400);
});
