import type { Request, Response, NextFunction } from "express";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { adminAccountService } from "../src/services/admin/account.service";
import { accountContactService } from "../src/services/account-contact.service";
import { globalErrorHandler } from "../src/middlewares/error.middleware";
import { checkAccountContactsSchema } from "../src/validates/admin/account.validate";
import { accountPhonePattern, normalizeAccountPhone } from "../src/utils/account/normalizeContact";
import AccountModel from "../src/models/account.model";

const phone = "0356259548";
const input = { name: "Nguyễn Văn An", email: "an@asiafnb.com", phone, password: "Password123!", role: "manager" as const };
const existing = { _id: "507f1f77bcf86cd799439012", ...input, status: "active", permissionGroupIds: [] };
afterEach(() => jest.restoreAllMocks());

describe("account contact checks", () => {
  beforeEach(() => {
    jest.spyOn(adminAccountRepository, "findByEmail").mockResolvedValue(null);
    jest.spyOn(adminAccountRepository, "findByPhone").mockResolvedValue(null);
    jest.spyOn(adminAccountRepository, "create").mockResolvedValue({ toObject: () => existing } as never);
  });
  it.each(["active", "pending", "inactive"])("rejects duplicate email for a %s account before writing", async (status) => {
    jest.mocked(adminAccountRepository.findByEmail).mockResolvedValue({ ...existing, status } as never);
    await expect(adminAccountService.createAccount(input, "507f1f77bcf86cd799439abc")).rejects.toMatchObject({ statusCode: 409, fieldErrors: { email: "Email đã được sử dụng." } });
    expect(adminAccountRepository.create).not.toHaveBeenCalled();
  });
  it.each(["active", "pending", "inactive"])("rejects duplicate phone for a %s account before writing", async (status) => {
    jest.mocked(adminAccountRepository.findByPhone).mockResolvedValue({ ...existing, status } as never);
    await expect(adminAccountService.createAccount(input, "507f1f77bcf86cd799439abc")).rejects.toMatchObject({ statusCode: 409, fieldErrors: { phone: "Số điện thoại đã được sử dụng." } });
    expect(adminAccountRepository.create).not.toHaveBeenCalled();
  });
  it("reports both duplicate fields together", async () => {
    jest.mocked(adminAccountRepository.findByEmail).mockResolvedValue(existing as never);
    jest.mocked(adminAccountRepository.findByPhone).mockResolvedValue(existing as never);
    await expect(adminAccountService.createAccount(input, "507f1f77bcf86cd799439abc")).rejects.toMatchObject({ statusCode: 409, fieldErrors: { email: "Email đã được sử dụng.", phone: "Số điện thoại đã được sử dụng." } });
    expect(adminAccountRepository.create).not.toHaveBeenCalled();
  });
  it("checks a single supplied contact and does not expose another account", async () => {
    jest.mocked(adminAccountRepository.findByPhone).mockResolvedValue(existing as never);
    expect(await accountContactService.check({ phone })).toEqual({ phoneAvailable: false });
    expect(adminAccountRepository.findByEmail).not.toHaveBeenCalled();
  });
  it("allows unused contacts and does not claim they are available if DB lookup fails", async () => {
    expect(await accountContactService.check(input)).toEqual({ emailAvailable: true, phoneAvailable: true });
    jest.mocked(adminAccountRepository.findByPhone).mockRejectedValue(new Error("database unavailable"));
    await expect(adminAccountService.createAccount(input, "507f1f77bcf86cd799439abc")).rejects.toThrow("database unavailable");
    expect(adminAccountRepository.create).not.toHaveBeenCalled();
  });
  it.each([{}, { email: "an@gmail.com" }, { phone: "12345" }])("validates check-contacts input %j", (body) => {
    expect(checkAccountContactsSchema.validate(body).error).toBeDefined();
  });
});

describe("phone normalization and legacy compatibility", () => {
  it.each([phone, "+84356259548", "+84 356-259-548", "0356.259.548", " 0356 259 548 "])("matches equivalent stored number %s", (value) => {
    expect(normalizeAccountPhone(value)).toBe(phone);
    expect(accountPhonePattern(phone).test(value)).toBe(true);
  });
  it.each(["0356259549", "10356259548", "03562595480", "text0356259548"])("does not conflate different numbers: %s", (value) => {
    expect(accountPhonePattern(phone).test(value)).toBe(false);
  });
  it("normalizes and generates the unique key for a new account", async () => {
    const account = new AccountModel({ ...input, phone: "+84 356-259-548" });
    await account.validate();
    expect(account.phone).toBe(phone);
    expect(account.phoneKey).toBe(phone);
  });
  it("does not rewrite a legacy account's phone key when only other fields change", async () => {
    const account = AccountModel.hydrate({ ...existing, phone: "+84 356-259-548" });
    account.name = "Tên mới";
    await account.validate();
    expect(account.phoneKey).toBeUndefined();
    expect(account.phone).toBe("+84 356-259-548");
  });
});

describe("concurrent account conflicts", () => {
  it.each([["phoneKey", "phone"], ["email", "email"]])("maps MongoDB duplicate %s to an inline %s error", (key, field) => {
    const response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    globalErrorHandler({ code: 11000, keyPattern: { [key]: 1 } }, {} as Request, response as unknown as Response, jest.fn() as NextFunction);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, fieldErrors: { [field]: expect.any(String) } }));
  });
});
