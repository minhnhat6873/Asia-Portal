import bcrypt from "bcryptjs";
import { createHmac } from "crypto";
import type { ClientSession } from "mongoose";
import type { UserAuthChallenge } from "../src/interfaces/user-auth.interface";
import { userAuthChallengeRepository as repo } from "../src/repositories/user/auth-challenge.repository";
import { userAuthOtpService as service } from "../src/services/user/auth-otp.service";
import { emailService } from "../src/services/notification/email.service";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";

const email = "member@asiafnb.com", code = "123456", secret = "user-otp-test-only";
let pending: UserAuthChallenge | null;
let previousSecret: string | undefined;
const session = {} as ClientSession;
let tail: Promise<void>;
const same = (value: UserAuthChallenge) => pending?.requestId === value.requestId && pending?.otpHash === value.otpHash;
const usable = (value: UserAuthChallenge) => same(value) && pending!.expiresAt > new Date() && pending!.attempts < 5;
function fixture(purpose: "register" | "reset" = "register"): UserAuthChallenge {
  const requestId = "generation-1";
  return { email, purpose, requestId, otpHash: createHmac("sha256", secret).update(`user:${purpose}:${email}:${requestId}:${code}`).digest("hex"),
    expiresAt: new Date(Date.now() + 180000), resendAvailableAt: new Date(Date.now() - 1000), attempts: 0, resendCount: 0,
    name: "Nguyễn An", phone: "0901234567", passwordHash: "private-bcrypt", accountId: "507f1f77bcf86cd799439012", authVersion: 0 };
}
beforeEach(() => {
  previousSecret = process.env.OTP_SECRET; process.env.OTP_SECRET = secret;
  pending = fixture(); tail = Promise.resolve();
  jest.spyOn(bcrypt, "hash").mockResolvedValue("new-bcrypt" as never);
  jest.spyOn(emailService, "sendRegistrationOtp").mockResolvedValue();
  jest.spyOn(emailService, "sendPasswordResetOtp").mockResolvedValue();
  jest.spyOn(repo, "find").mockImplementation((address, purpose) => Promise.resolve(pending && pending.email === address && pending.purpose === purpose ? { ...pending } : null) as never);
  jest.spyOn(repo, "findAccount").mockResolvedValue({ _id: "507f1f77bcf86cd799439012", authVersion: 0 } as never);
  jest.spyOn(repo, "contactExists").mockResolvedValue(null);
  jest.spyOn(repo, "reserve").mockImplementation(value => {
    if (pending && pending.expiresAt > new Date()) return Promise.reject(Object.assign(new Error("duplicate"), { code: 11000 })) as never;
    pending = { ...value }; return Promise.resolve(pending) as never;
  });
  jest.spyOn(repo, "fail").mockImplementation(value => {
    if (!usable(value)) return Promise.resolve(null) as never;
    pending!.attempts++; return Promise.resolve({ ...pending }) as never;
  });
  jest.spyOn(repo, "replace").mockImplementation((value, next) => {
    if (!usable(value) || pending!.resendCount >= 3 || pending!.resendAvailableAt > new Date()) return Promise.resolve(null) as never;
    pending = { ...pending!, ...next, resendCount: pending!.resendCount + 1 };
    return Promise.resolve({ ...pending }) as never;
  });
  jest.spyOn(repo, "restore").mockImplementation((value, old) => {
    if (same(value)) pending = { ...pending!, requestId: old.requestId, otpHash: old.otpHash, expiresAt: old.expiresAt, resendAvailableAt: old.resendAvailableAt, resendCount: pending!.resendCount - 1 };
    return Promise.resolve({ modifiedCount: 1 }) as never;
  });
  jest.spyOn(repo, "remove").mockImplementation(value => {
    const match = same(value); if (match) pending = null;
    return Promise.resolve({ deletedCount: Number(match) }) as never;
  });
  jest.spyOn(repo, "consume").mockImplementation(value => {
    if (!usable(value)) return Promise.resolve(null) as never;
    const consumed = { ...pending }; pending = null; return Promise.resolve(consumed) as never;
  });
  jest.spyOn(repo, "createAccount").mockResolvedValue({ role: "user", status: "pending" } as never);
  jest.spyOn(repo, "resetPassword").mockResolvedValue({ _id: "507f1f77bcf86cd799439012" } as never);
  jest.spyOn(adminAccountRepository, "unlockLoginFailed").mockResolvedValue({} as never);
  jest.spyOn(adminAccountRepository, "findByEmail").mockResolvedValue({ username: "an@asiafnb.com" } as never);
  jest.spyOn(repo, "transaction").mockImplementation(async work => {
    const before = tail; let unlock!: () => void; tail = new Promise<void>(resolve => { unlock = resolve; });
    await before; const original = pending ? { ...pending } : null;
    try { return await work(session); } catch (error) { pending = original; throw error; } finally { unlock(); }
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  if (previousSecret === undefined) delete process.env.OTP_SECRET; else process.env.OTP_SECRET = previousSecret;
});
it("only one of twenty simultaneous registration confirmations creates an account", async () => {
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => service.verify(email, "register", code)));
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(repo.createAccount).toHaveBeenCalledTimes(1);
  expect(repo.createAccount).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: "private-bcrypt" }), session);
  expect(pending).toBeNull();
});
it("five wrong guesses lock the challenge even under parallel guesses", async () => {
  await Promise.allSettled(Array.from({ length: 20 }, () => service.verify(email, "register", "000000")));
  expect(pending!.attempts).toBe(5);
  await expect(service.verify(email, "register", code)).rejects.toMatchObject({ statusCode: 429 });
  await expect(service.resend(email, "register")).rejects.toMatchObject({ statusCode: 429 });
  expect(repo.createAccount).not.toHaveBeenCalled();
});
it("resending preserves failures and invalidates the previous OTP", async () => {
  pending!.attempts = 4;
  await service.resend(email, "register");
  expect(pending!.attempts).toBe(4); expect(pending!.resendCount).toBe(1);
  expect(pending!.requestId).not.toBe("generation-1");
  await expect(service.verify(email, "register", code)).rejects.toMatchObject({ statusCode: 400 });
  expect(pending!.attempts).toBe(5);
});
it("repeated starts cannot reset an unexpired challenge", async () => {
  pending!.attempts = 4;
  await expect(service.start(email, "register", { email, name: "Nguyễn An", phone: "0901234567", password: "Aa1!bbbb" })).rejects.toMatchObject({ statusCode: 429 });
  expect(pending!.attempts).toBe(4); expect(emailService.sendRegistrationOtp).not.toHaveBeenCalled();
});
it("unknown reset accounts and duplicate registration contacts return generic data without sending mail", async () => {
  jest.mocked(repo.findAccount).mockResolvedValue(null);
  expect(await service.start(email, "reset")).toEqual({ email, expiresInSeconds: 180, resendAfterSeconds: 60 });
  jest.mocked(repo.contactExists).mockResolvedValue({ _id: "duplicate" } as never);
  await service.start(email, "register", { email, name: "Nguyễn An", phone: "0901234567", password: "Aa1!bbbb" });
  expect(emailService.sendPasswordResetOtp).not.toHaveBeenCalled(); expect(emailService.sendRegistrationOtp).not.toHaveBeenCalled();
});
it("SMTP failure removes only the new request; failed resend restores the previous code", async () => {
  pending = null; jest.mocked(emailService.sendRegistrationOtp).mockRejectedValue(new Error("smtp-test"));
  await expect(service.start(email, "register", { email, name: "Nguyễn An", phone: "0901234567", password: "Aa1!bbbb" })).rejects.toThrow("smtp-test");
  expect(pending).toBeNull();
  pending = fixture(); pending.attempts = 2;
  await expect(service.resend(email, "register")).rejects.toThrow("smtp-test");
  expect(pending).toMatchObject({ requestId: "generation-1", attempts: 2, resendCount: 0 });
});
it("reset verification alone does not change a password; only one concurrent reset succeeds", async () => {
  pending = fixture("reset"); await service.verify(email, "reset", code);
  expect(repo.resetPassword).not.toHaveBeenCalled(); expect(pending).not.toBeNull();
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => service.reset(email, code, "New-password123!")));
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(repo.resetPassword).toHaveBeenCalledTimes(1); expect(pending).toBeNull();
});
it("an account change during reset rolls the OTP consumption back", async () => {
  pending = fixture("reset"); jest.mocked(repo.resetPassword).mockResolvedValue(null);
  await expect(service.reset(email, code, "New-password123!")).rejects.toMatchObject({ statusCode: 400 });
  expect(pending).not.toBeNull();
});
it("expired OTP and an OTP for another purpose cannot authorize registration", async () => {
  pending!.expiresAt = new Date(Date.now() - 1);
  await expect(service.verify(email, "register", code)).rejects.toMatchObject({ statusCode: 400 });
  pending = fixture("reset");
  await expect(service.verify(email, "register", code)).rejects.toMatchObject({ statusCode: 400 });
  expect(repo.createAccount).not.toHaveBeenCalled();
});
it("a new password asks to lift a wrong-password lock (Admin gốc only), and the code email shows the username", async () => {
  pending = fixture("reset");
  await service.reset(email, code, "New-password123!");
  expect(adminAccountRepository.unlockLoginFailed).toHaveBeenCalledWith("507f1f77bcf86cd799439012", expect.anything());
  pending = null; jest.mocked(repo.findAccount).mockResolvedValue({ _id: "507f1f77bcf86cd799439012", authVersion: 0 } as never);
  await service.start(email, "reset");
  expect(emailService.sendPasswordResetOtp).toHaveBeenLastCalledWith(email, expect.any(String), "an@asiafnb.com");
});
