import { authSessionRepository } from "../src/repositories/admin/auth-session.repository";
import type { Request, Response } from "express";
import type { ClientSession } from "mongoose";
import jwt from "jsonwebtoken";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { accountAdministrationRepository } from "../src/repositories/admin/account-administration.repository";
import { adminAccountService } from "../src/services/admin/account.service";
import { emailService } from "../src/services/notification/email.service";
import { requireAdminAuth } from "../src/middlewares/auth.middleware";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { AUTH_COOKIE_NAME } from "../src/config/auth.config";
import { resetPasswordSchema, updateAccountSchema } from "../src/validates/admin/account.validate";

const actorId = "507f1f77bcf86cd799439011", targetId = "507f1f77bcf86cd799439012";
const session = {} as ClientSession;
const target = { _id: targetId, name: "Nhân viên", email: "old@asiafnb.com", phone: "0901234567", role: "manager", status: "active", permissionGroupIds: [] };
beforeEach(() => {
  jest.spyOn(accountAdministrationRepository, "runExclusive").mockImplementation((work) => work(session));
  jest.spyOn(authSessionRepository, "findActive").mockResolvedValue({ authVersion: 0 } as never);
      jest.spyOn(adminAccountRepository, "findActiveById").mockResolvedValue({ ...target, _id: actorId, role: "admin" } as never);
  jest.spyOn(adminAccountRepository, "findById").mockResolvedValue(target as never);
  jest.spyOn(adminAccountRepository, "findByEmail").mockResolvedValue(null);
  jest.spyOn(adminAccountRepository, "findByPhone").mockResolvedValue(null);
  jest.spyOn(adminAccountRepository, "updateById").mockImplementation((_id, data) => Promise.resolve({ ...target, ...data }) as never);
  jest.spyOn(adminAccountRepository, "resetManagedPassword").mockResolvedValue(target as never);
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([]);
  jest.spyOn(emailService, "sendManagedPasswordResetNotice").mockResolvedValue();
});
afterEach(() => jest.restoreAllMocks());

describe("managed account edits", () => {
  it("allows a root Admin to change another account email without OTP", async () => {
    const result = await adminAccountService.updateAccount(targetId, { email: " NEW@ASIAFNB.COM ", phone: "0912345678", notes: "Đã xác nhận với IT" }, actorId);
    expect(result.email).toBe("new@asiafnb.com");
    expect(adminAccountRepository.updateById).toHaveBeenCalledWith(targetId, expect.objectContaining({ email: "new@asiafnb.com", phone: "0912345678", notes: "Đã xác nhận với IT" }), "manager", session);
  });
  it.each([actorId, actorId.toUpperCase()])("cannot bypass self email OTP using PATCH /accounts/:id (%s)", async (id) => {
    await expect(adminAccountService.updateAccount(id, { email: "new@asiafnb.com" }, actorId)).rejects.toMatchObject({ statusCode: 400 });
    expect(adminAccountRepository.updateById).not.toHaveBeenCalled();
  });
  it.each(["email", "phone"] as const)("rejects duplicate %s before updating", async (field) => {
    if (field === "email") jest.mocked(adminAccountRepository.findByEmail).mockResolvedValue(target as never);
    else jest.mocked(adminAccountRepository.findByPhone).mockResolvedValue(target as never);
    await expect(adminAccountService.updateAccount(targetId, { [field]: field === "email" ? "new@asiafnb.com" : "0912345678" }, actorId)).rejects.toMatchObject({ statusCode: 409 });
    expect(adminAccountRepository.updateById).not.toHaveBeenCalled();
  });
  it("allows unchanged legacy phone formatting without checking it against itself", async () => {
    await adminAccountService.updateAccount(targetId, { phone: "+84 901-234-567" }, actorId);
    expect(adminAccountRepository.findByPhone).not.toHaveBeenCalled();
  });
  it("validates edited email and phone and matching password confirmation", () => {
    expect(updateAccountSchema.validate({ email: "wrong@gmail.com" }).error).toBeDefined();
    expect(updateAccountSchema.validate({ phone: "123" }).error).toBeDefined();
    expect(resetPasswordSchema.validate({ password: "NewPassword123!", confirmPassword: "Different123!" }).error).toBeDefined();
    expect(updateAccountSchema.validate({ notes: "", email: "NEW@ASIAFNB.COM" }).value.email).toBe("new@asiafnb.com");
  });
  it.each([
    { password: "NewPassword123!" },
    { password: "NewPassword123!", confirmPassword: "" },
    { password: "short", confirmPassword: "short" },
    { password: "        ", confirmPassword: "        " },
    { password: "A".repeat(101), confirmPassword: "A".repeat(101) },
  ])("rejects invalid direct password reset requests: %j", (body) => {
    expect(resetPasswordSchema.validate(body).error).toBeDefined();
  });
  it("resets the password and sends a notification without the password", async () => {
    await expect(adminAccountService.resetPassword(targetId, { password: "Replacement123!", notifyUser: true }, actorId)).resolves.toEqual({ notificationSent: true });
    expect(adminAccountRepository.resetManagedPassword).toHaveBeenCalledWith(targetId, expect.any(String), session);
    expect(emailService.sendManagedPasswordResetNotice).toHaveBeenCalledWith(target.email, target.name);
  });
  it("reports a mail failure separately after a successful reset", async () => {
    jest.mocked(emailService.sendManagedPasswordResetNotice).mockRejectedValue(new Error("SMTP unavailable"));
    await expect(adminAccountService.resetPassword(targetId, { password: "Replacement123!", notifyUser: true }, actorId)).resolves.toEqual({ notificationSent: false });
    expect(adminAccountRepository.resetManagedPassword).toHaveBeenCalledTimes(1);
  });
});

describe("legacy mandatory password change no longer restricts access", () => {
  const previousSecret = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = "account-edit-test-secret"; });
  afterAll(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
  it.each([
    "/admin/employees", "/admin/accounts", "/admin/auth/email/request-otp",
    "/admin/auth/me", "/admin/auth/logout", "/admin/auth/password/request-otp", "/admin/auth/password/resend-otp", "/admin/auth/password",
  ])("authenticates %s even when the database contains a legacy flag", async (path) => {
    jest.mocked(adminAccountRepository.findActiveById).mockResolvedValue({ ...target, mustChangePassword: true } as never);
    const token = jwt.sign({ tokenType: "access", sid: "test-session", version: 0 }, process.env.JWT_SECRET!, { subject: targetId });
    const request = { originalUrl: path, cookies: { [AUTH_COOKIE_NAME]: token } } as unknown as Request;
    const response = { status: jest.fn(), json: jest.fn() }; response.status.mockReturnValue(response);
    const next = jest.fn();
    await requireAdminAuth(request, response as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(request.admin).not.toHaveProperty("mustChangePassword");
  });
});
