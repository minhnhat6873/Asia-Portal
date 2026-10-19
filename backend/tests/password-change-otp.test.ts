import bcrypt from "bcryptjs";
import { createHmac } from "crypto";
import type { ClientSession } from "mongoose";
import { passwordChangeOtpService } from "../src/services/admin/password-change-otp.service";
import { passwordChangeOtpRepository as repository } from "../src/repositories/admin/password-change-otp.repository";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { emailService } from "../src/services/notification/email.service";
import { changePasswordSchema, requestPasswordChangeOtpSchema } from "../src/validates/admin/auth.validate";
import type { PasswordChangeOtp } from "../src/interfaces/password-change-otp.interface";

const accountId = "507f1f77bcf86cd799439012", requestId = "a3123456-1234-4234-9234-123456789abc", secret = "password-change-test-only-secret";
const oldPassword = "OldPassword123!", newPassword = "NewPassword123!", currentPasswordHash = bcrypt.hashSync(oldPassword, 4);
const digest = (code: string) => createHmac("sha256", secret).update(`password-change:${accountId}:${requestId}:${code}`).digest("hex");
const account = { _id: accountId, email: "owner@asiafnb.com", password: currentPasswordHash, status: "active", role: "admin" };
let pending: PasswordChangeOtp;
let previousSecret: string | undefined;
beforeEach(() => {
  previousSecret = process.env.OTP_SECRET; process.env.OTP_SECRET = secret;
  pending = { accountId, requestId, email: account.email, otpHash: digest("123456"), currentPasswordHash, newPasswordHash: "new-password-hash", otpExpiresAt: new Date(Date.now() + 180000), otpAttempts: 0, resendAvailableAt: new Date(Date.now() - 1000), resendCount: 0 };
  jest.spyOn(adminAccountRepository, "findByIdWithPassword").mockResolvedValue(account as never);
  jest.spyOn(adminAccountRepository, "changePasswordIfUnchanged").mockResolvedValue(account as never);
  jest.spyOn(repository, "reserve").mockImplementation(async (data) => data as never);
  jest.spyOn(repository, "find").mockImplementation(() => Promise.resolve(pending) as never);
  jest.spyOn(repository, "consume").mockImplementation(() => Promise.resolve(pending) as never);
  jest.spyOn(repository, "incrementAttempts").mockImplementation(() => Promise.resolve({ ...pending, otpAttempts: 1 }) as never);
  jest.spyOn(repository, "replaceCode").mockImplementation((_account, _request, _hash, data) => Promise.resolve({ ...pending, ...data, resendCount: 1 }) as never);
  jest.spyOn(repository, "restoreAfterSendFailure").mockResolvedValue({} as never);
  jest.spyOn(repository, "deleteRequest").mockResolvedValue({} as never);
  jest.spyOn(repository, "transaction").mockImplementation((work) => work({} as ClientSession));
  jest.spyOn(emailService, "sendPasswordChangeOtp").mockResolvedValue();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (previousSecret === undefined) delete process.env.OTP_SECRET; else process.env.OTP_SECRET = previousSecret;
});

describe("request password-change OTP", () => {
  it.each(["admin", "manager"])("sends to the stored email for %s, stores only hashes, and does not change the password", async (role) => {
    jest.mocked(adminAccountRepository.findByIdWithPassword).mockResolvedValue({ ...account, role } as never);
    const result = await passwordChangeOtpService.request(accountId, { currentPassword: oldPassword, newPassword });
    const stored = jest.mocked(repository.reserve).mock.calls[0]![0];
    expect(emailService.sendPasswordChangeOtp).toHaveBeenCalledWith(account.email, expect.stringMatching(/^\d{6}$/));
    expect(stored.currentPasswordHash).toBe(currentPasswordHash);
    expect(await bcrypt.compare(newPassword, stored.newPasswordHash)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain(newPassword);
    expect(result).toMatchObject({ email: account.email, requestId: expect.any(String) });
    expect(result.expiresInSeconds).toBeLessThanOrEqual(180);
    expect(result).not.toHaveProperty("otpHash"); expect(result).not.toHaveProperty("newPasswordHash");
    expect(adminAccountRepository.changePasswordIfUnchanged).not.toHaveBeenCalled();
  });
  it("rejects an incorrect current password without sending mail", async () => {
    await expect(passwordChangeOtpService.request(accountId, { currentPassword: "WrongPassword123!", newPassword })).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.reserve).not.toHaveBeenCalled(); expect(emailService.sendPasswordChangeOtp).not.toHaveBeenCalled();
  });
  it("rejects reusing the current password", async () => {
    await expect(passwordChangeOtpService.request(accountId, { currentPassword: oldPassword, newPassword: oldPassword })).rejects.toMatchObject({ statusCode: 400 });
  });
  it("does not allow unauthenticated/pending/user accounts", async () => {
    for (const value of [null, { ...account, status: "inactive" }, { ...account, role: "user" }]) {
      jest.mocked(adminAccountRepository.findByIdWithPassword).mockResolvedValue(value as never);
      await expect(passwordChangeOtpService.request(accountId, { currentPassword: oldPassword, newPassword })).rejects.toMatchObject({ statusCode: 403 });
    }
  });
  it("enforces concurrent request cooldown", async () => {
    jest.mocked(repository.reserve).mockRejectedValue({ code: 11000 });
    await expect(passwordChangeOtpService.request(accountId, { currentPassword: oldPassword, newPassword })).rejects.toMatchObject({ statusCode: 429 });
    expect(emailService.sendPasswordChangeOtp).not.toHaveBeenCalled();
  });
  it("cleans only its own request on SMTP failure", async () => {
    jest.mocked(emailService.sendPasswordChangeOtp).mockRejectedValue(new Error("SMTP unavailable"));
    await expect(passwordChangeOtpService.request(accountId, { currentPassword: oldPassword, newPassword })).rejects.toThrow("SMTP unavailable");
    const stored = jest.mocked(repository.reserve).mock.calls[0]![0];
    expect(repository.deleteRequest).toHaveBeenCalledWith(accountId, stored.requestId);
    expect(adminAccountRepository.changePasswordIfUnchanged).not.toHaveBeenCalled();
  });
  it("rejects the old direct-change payload and validates OTP format", () => {
    expect(changePasswordSchema.validate({ currentPassword: oldPassword, newPassword }).error).toBeDefined();
    for (const code of ["12345", "1234567", "abcdef", ""]) expect(changePasswordSchema.validate({ requestId, code }).error).toBeDefined();
    expect(changePasswordSchema.validate({ requestId, code: "123456" }).error).toBeUndefined();
    expect(requestPasswordChangeOtpSchema.validate({ currentPassword: oldPassword, newPassword: "        " }).error).toBeDefined();
  });
});

describe("confirm password-change OTP", () => {
  it("counts wrong attempts atomically and never changes the password", async () => {
    await expect(passwordChangeOtpService.confirm(accountId, { requestId, code: "111111" })).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.incrementAttempts).toHaveBeenCalledWith(accountId, requestId, pending.otpHash, expect.any(Date));
    expect(repository.consume).not.toHaveBeenCalled(); expect(adminAccountRepository.changePasswordIfUnchanged).not.toHaveBeenCalled();
  });
  it("enforces expiry even if MongoDB TTL has not deleted the document", async () => {
    pending.otpExpiresAt = new Date(Date.now() - 1);
    await expect(passwordChangeOtpService.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.transaction).not.toHaveBeenCalled();
  });
  it("locks verification after five failed attempts", async () => {
    pending.otpAttempts = 5;
    await expect(passwordChangeOtpService.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 429 });
    expect(repository.consume).not.toHaveBeenCalled();
  });
  it("rejects a request that belongs to a different account", async () => {
    jest.mocked(repository.find).mockResolvedValue(null);
    await expect(passwordChangeOtpService.confirm("another-account", { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.find).toHaveBeenCalledWith("another-account", requestId);
    expect(adminAccountRepository.changePasswordIfUnchanged).not.toHaveBeenCalled();
  });
  it("consumes the code and writes the password bound to the request within the same transaction", async () => {
    await passwordChangeOtpService.confirm(accountId, { requestId, code: "123456" });
    expect(repository.transaction).toHaveBeenCalledTimes(1);
    expect(repository.consume).toHaveBeenCalledWith(accountId, requestId, digest("123456"), expect.any(Date), expect.any(Object));
    expect(adminAccountRepository.changePasswordIfUnchanged).toHaveBeenCalledWith(accountId, account.email, currentPasswordHash, pending.newPasswordHash, expect.any(Object));
  });
  it("blocks reused/resend-invalidated codes", async () => {
    jest.mocked(repository.consume).mockResolvedValue(null);
    await expect(passwordChangeOtpService.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 400 });
    expect(adminAccountRepository.changePasswordIfUnchanged).not.toHaveBeenCalled();
  });
  it("rejects an account changed/locked/deleted after OTP was issued", async () => {
    jest.mocked(adminAccountRepository.changePasswordIfUnchanged).mockResolvedValue(null);
    await expect(passwordChangeOtpService.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("resend password-change OTP", () => {
  it("enforces resend cooldown and maximum resend count", async () => {
    pending.resendAvailableAt = new Date(Date.now() + 60000);
    await expect(passwordChangeOtpService.resend(accountId, requestId)).rejects.toMatchObject({ statusCode: 429 });
    pending.resendAvailableAt = new Date(0); pending.resendCount = 3;
    await expect(passwordChangeOtpService.resend(accountId, requestId)).rejects.toMatchObject({ statusCode: 429 });
    expect(emailService.sendPasswordChangeOtp).not.toHaveBeenCalled();
  });
  it("invalidates the old code and sends a new one to the same stored email", async () => {
    await passwordChangeOtpService.resend(accountId, requestId);
    const replacement = jest.mocked(repository.replaceCode).mock.calls[0]![3];
    expect(replacement.otpHash).not.toBe(pending.otpHash);
    expect(emailService.sendPasswordChangeOtp).toHaveBeenCalledWith(account.email, expect.stringMatching(/^\d{6}$/));
  });
  it("rejects a stale password snapshot before resending", async () => {
    jest.mocked(adminAccountRepository.findByIdWithPassword).mockResolvedValue({ ...account, password: "changed-hash" } as never);
    await expect(passwordChangeOtpService.resend(accountId, requestId)).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.replaceCode).not.toHaveBeenCalled();
  });
  it("restores the previously usable OTP if resend mail fails", async () => {
    jest.mocked(emailService.sendPasswordChangeOtp).mockRejectedValue(new Error("SMTP unavailable"));
    await expect(passwordChangeOtpService.resend(accountId, requestId)).rejects.toThrow("SMTP unavailable");
    expect(repository.restoreAfterSendFailure).toHaveBeenCalledWith(accountId, requestId, expect.any(String), pending);
  });
});
