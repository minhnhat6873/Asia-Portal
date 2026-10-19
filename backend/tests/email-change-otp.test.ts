import { createHmac } from "crypto";
import type { ClientSession } from "mongoose";
import type { EmailChangeOtp } from "../src/interfaces/email-change-otp.interface";
import { emailChangeOtpService as service } from "../src/services/admin/email-change-otp.service";
import { emailChangeOtpRepository as repository } from "../src/repositories/admin/email-change-otp.repository";
import { adminAccountRepository as accounts } from "../src/repositories/admin/account.repository";
import { emailService } from "../src/services/notification/email.service";
import { changeEmailSchema, requestEmailChangeOtpSchema, resendEmailChangeOtpSchema } from "../src/validates/admin/auth.validate";

const accountId = "507f1f77bcf86cd799439012", requestId = "a3123456-1234-4234-9234-123456789abc", secret = "email-change-test-secret";
const newEmail = "new.owner@asiafnb.com", account = { _id: accountId, email: "owner@asiafnb.com", password: "current-password-hash", status: "active", role: "admin" };
const digest = (code: string) => createHmac("sha256", secret).update(`email-change:${accountId}:${requestId}:${newEmail}:${code}`).digest("hex");
let pending: EmailChangeOtp, previousSecret: string | undefined;
beforeEach(() => {
  previousSecret = process.env.OTP_SECRET; process.env.OTP_SECRET = secret;
  pending = { accountId, requestId, currentEmail: account.email, newEmail, currentPasswordHash: account.password, otpHash: digest("123456"), otpExpiresAt: new Date(Date.now() + 180000), otpAttempts: 0, resendAvailableAt: new Date(0), resendCount: 0 };
  jest.spyOn(accounts, "findByIdWithPassword").mockResolvedValue(account as never);
  jest.spyOn(accounts, "findByEmail").mockResolvedValue(null);
  jest.spyOn(accounts, "changeEmailIfUnchanged").mockResolvedValue({ ...account, email: newEmail } as never);
  jest.spyOn(repository, "reserve").mockImplementation(async (data) => data as never);
  jest.spyOn(repository, "find").mockImplementation(() => Promise.resolve(pending) as never);
  jest.spyOn(repository, "consume").mockImplementation(() => Promise.resolve(pending) as never);
  jest.spyOn(repository, "incrementAttempts").mockImplementation(() => Promise.resolve({ ...pending, otpAttempts: 1 }) as never);
  jest.spyOn(repository, "replaceCode").mockImplementation((_account, _request, _hash, data) => Promise.resolve({ ...pending, ...data, resendCount: 1 }) as never);
  jest.spyOn(repository, "restoreAfterSendFailure").mockResolvedValue({} as never);
  jest.spyOn(repository, "deleteRequest").mockResolvedValue({} as never);
  jest.spyOn(repository, "transaction").mockImplementation((work) => work({} as ClientSession));
  jest.spyOn(emailService, "sendEmailChangeOtp").mockResolvedValue();
});
afterEach(() => { jest.restoreAllMocks(); if (previousSecret === undefined) delete process.env.OTP_SECRET; else process.env.OTP_SECRET = previousSecret; });

describe("request email change", () => {
  it.each(["admin", "manager"])("lets %s verify their new email without changing the account yet", async (role) => {
    jest.mocked(accounts.findByIdWithPassword).mockResolvedValue({ ...account, role } as never);
    const result = await service.request(accountId, { newEmail: " NEW.Owner@asiafnb.com " });
    expect(emailService.sendEmailChangeOtp).toHaveBeenCalledWith(newEmail, expect.stringMatching(/^\d{6}$/));
    expect(accounts.changeEmailIfUnchanged).not.toHaveBeenCalled();
    const stored = jest.mocked(repository.reserve).mock.calls[0]![0];
    expect(stored).toMatchObject({ accountId, currentEmail: account.email, newEmail, currentPasswordHash: account.password });
    expect(stored.otpHash).not.toEqual(jest.mocked(emailService.sendEmailChangeOtp).mock.calls[0]![1]);
    expect(Object.keys(result).sort()).toEqual(["email", "expiresInSeconds", "requestId", "resendAfterSeconds"]);
    expect(result.email).toBe(newEmail);
  });
  it("rejects the existing email and duplicate emails in any status", async () => {
    await expect(service.request(accountId, { newEmail: account.email.toUpperCase() })).rejects.toMatchObject({ statusCode: 400 });
    for (const status of ["pending", "active", "inactive"]) {
      jest.mocked(accounts.findByEmail).mockResolvedValue({ ...account, status } as never);
      await expect(service.request(accountId, { newEmail })).rejects.toMatchObject({ statusCode: 409 });
    }
    expect(emailService.sendEmailChangeOtp).not.toHaveBeenCalled();
  });
  it.each([null, { ...account, status: "inactive" }, { ...account, role: "user" }])("rejects an unavailable account", async (value) => {
    jest.mocked(accounts.findByIdWithPassword).mockResolvedValue(value as never);
    await expect(service.request(accountId, { newEmail })).rejects.toMatchObject({ statusCode: 403 });
  });
  it("enforces request cooldown and cleans up a failed initial send", async () => {
    jest.mocked(repository.reserve).mockRejectedValueOnce({ code: 11000 });
    await expect(service.request(accountId, { newEmail })).rejects.toMatchObject({ statusCode: 429 });
    jest.mocked(emailService.sendEmailChangeOtp).mockRejectedValue(new Error("SMTP unavailable"));
    await expect(service.request(accountId, { newEmail })).rejects.toThrow("SMTP unavailable");
    expect(repository.deleteRequest).toHaveBeenCalledWith(accountId, expect.any(String));
    expect(accounts.changeEmailIfUnchanged).not.toHaveBeenCalled();
  });
  it("requires company email and OTP rather than direct replacement", () => {
    expect(requestEmailChangeOtpSchema.validate({ newEmail: " NEW.Owner@asiafnb.com " }).value.newEmail).toBe(newEmail);
    expect(requestEmailChangeOtpSchema.validate({ newEmail: "test@asiafnb.com" }).error).toBeUndefined();
    for (const email of ["", "invalid", "test@gmail.com", "test@outlook.com", "test..one@asiafnb.com", "test@asiafnb.com.example.com", "test@fakeasiafnb.com"]) expect(requestEmailChangeOtpSchema.validate({ newEmail: email }).error).toBeDefined();
    expect(changeEmailSchema.validate({ newEmail }).error).toBeDefined();
    expect(changeEmailSchema.validate({ requestId, code: "123456" }).error).toBeUndefined();
    expect(changeEmailSchema.validate({ requestId, code: "12345" }).error).toBeDefined();
  });
  it("rejects missing or malformed bodies and non-string values", () => {
    for (const schema of [requestEmailChangeOtpSchema, resendEmailChangeOtpSchema, changeEmailSchema]) {
      for (const body of [undefined, null, [], "", 123, {}]) expect(schema.validate(body).error).toBeDefined();
    }
    for (const email of [null, 123, [], { $ne: null }, " ", "a".repeat(65) + "@asiafnb.com", "a".repeat(151) + "@asiafnb.com", "a b@asiafnb.com", "a@asiafnb.com\r\nBcc: other@asiafnb.com"]) {
      expect(requestEmailChangeOtpSchema.validate({ newEmail: email }).error).toBeDefined();
    }
    for (const id of [null, 123, [], { $ne: null }, "", "not-a-uuid"]) {
      expect(resendEmailChangeOtpSchema.validate({ requestId: id }).error).toBeDefined();
      expect(changeEmailSchema.validate({ requestId: id, code: "123456" }).error).toBeDefined();
    }
    for (const code of [null, 123456, [], { $ne: null }, "", "12345", "1234567", "abcdef", "１２３４５６", "123 45"]) expect(changeEmailSchema.validate({ requestId, code }).error).toBeDefined();
  });
});

describe("confirm email change", () => {
  it("rejects expired, exhausted, foreign, and wrong codes before writing email", async () => {
    pending.otpExpiresAt = new Date(0);
    await expect(service.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 400 });
    pending.otpExpiresAt = new Date(Date.now() + 180000); pending.otpAttempts = 5;
    await expect(service.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 429 });
    pending.otpAttempts = 0;
    await expect(service.confirm(accountId, { requestId, code: "111111" })).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.incrementAttempts).toHaveBeenCalledWith(accountId, requestId, pending.otpHash, expect.any(Date));
    jest.mocked(repository.find).mockResolvedValue(null);
    await expect(service.confirm("foreign-account", { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 400 });
    expect(accounts.changeEmailIfUnchanged).not.toHaveBeenCalled();
  });
  it("consumes the OTP and updates only its bound email in one transaction", async () => {
    expect(await service.confirm(accountId, { requestId, code: "123456" })).toEqual({ email: newEmail });
    expect(accounts.findByEmail).toHaveBeenCalledWith(newEmail, expect.any(Object));
    expect(accounts.changeEmailIfUnchanged).toHaveBeenCalledWith(accountId, account.email, newEmail, account.password, expect.any(Object));
  });
  it("rejects a replay or a code replaced by resend", async () => {
    jest.mocked(repository.consume).mockResolvedValue(null);
    await expect(service.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 400 });
    expect(accounts.changeEmailIfUnchanged).not.toHaveBeenCalled();
  });
  it("rechecks email uniqueness when confirming and catches a unique-index race", async () => {
    jest.mocked(accounts.findByEmail).mockResolvedValueOnce(account as never);
    await expect(service.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 409 });
    expect(accounts.changeEmailIfUnchanged).not.toHaveBeenCalled();
    jest.mocked(accounts.changeEmailIfUnchanged).mockRejectedValue({ code: 11000 });
    await expect(service.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 409 });
  });
  it("rejects account/email/password changes after OTP issuance", async () => {
    jest.mocked(accounts.changeEmailIfUnchanged).mockResolvedValue(null);
    await expect(service.confirm(accountId, { requestId, code: "123456" })).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("resend email change", () => {
  it("enforces cooldown and resend cap", async () => {
    pending.resendAvailableAt = new Date(Date.now() + 60000);
    await expect(service.resend(accountId, requestId)).rejects.toMatchObject({ statusCode: 429 });
    pending.resendAvailableAt = new Date(0); pending.resendCount = 3;
    await expect(service.resend(accountId, requestId)).rejects.toMatchObject({ statusCode: 429 });
    expect(emailService.sendEmailChangeOtp).not.toHaveBeenCalled();
  });
  it("replaces the OTP and sends only to the previously bound new email", async () => {
    await service.resend(accountId, requestId);
    expect(jest.mocked(repository.replaceCode).mock.calls[0]![3].otpHash).not.toBe(pending.otpHash);
    expect(emailService.sendEmailChangeOtp).toHaveBeenCalledWith(newEmail, expect.stringMatching(/^\d{6}$/));
  });
  it("rejects a stale account or newly occupied email before sending", async () => {
    jest.mocked(accounts.findByIdWithPassword).mockResolvedValueOnce({ ...account, email: "changed@asiafnb.com" } as never);
    await expect(service.resend(accountId, requestId)).rejects.toMatchObject({ statusCode: 409 });
    jest.mocked(accounts.findByEmail).mockResolvedValue(account as never);
    await expect(service.resend(accountId, requestId)).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.replaceCode).not.toHaveBeenCalled();
  });
  it("restores the prior usable OTP on mail failure", async () => {
    jest.mocked(emailService.sendEmailChangeOtp).mockRejectedValue(new Error("SMTP unavailable"));
    await expect(service.resend(accountId, requestId)).rejects.toThrow("SMTP unavailable");
    expect(repository.restoreAfterSendFailure).toHaveBeenCalledWith(accountId, requestId, expect.any(String), pending);
  });
});
