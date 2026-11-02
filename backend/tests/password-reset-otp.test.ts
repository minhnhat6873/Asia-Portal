import bcrypt from "bcryptjs";
import { createHmac, randomUUID } from "crypto";
import type { ClientSession } from "mongoose";
import type { PasswordResetOtp, PasswordResetOtpSnapshot } from "../src/interfaces/password-reset-otp.interface";
import { passwordResetOtpService as service } from "../src/services/user/password-reset-otp.service";
import { passwordResetOtpRepository as repository } from "../src/repositories/admin/password-reset-otp.repository";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { emailService } from "../src/services/notification/email.service";

const email = "owner@asiafnb.com", accountId = "507f1f77bcf86cd799439012", secret = "password-reset-test-only-secret";
const code = "123456", password = "NewPassword123!";
const digest = (value: string, requestId?: string) => createHmac("sha256", secret)
  .update(requestId ? `password-reset:${email}:${requestId}:${value}` : `password-reset:${email}:${value}`).digest("hex");
let pending: PasswordResetOtp | null;
let account: { _id: string; email: string; password: string; authVersion: number };
let previousSecret: string | undefined;
let transactionTail: Promise<void>;
const session = {} as ClientSession;
function fixture(overrides: Partial<PasswordResetOtp> = {}): PasswordResetOtp {
  const requestId = randomUUID();
  return { email, requestId, otpHash: digest(code, requestId), otpAttempts: 0, resendCount: 0,
    otpExpiresAt: new Date(Date.now() + 180_000), resendAvailableAt: new Date(Date.now() - 1_000), ...overrides };
}
const same = (snapshot: PasswordResetOtpSnapshot) => Boolean(pending && pending.email === snapshot.email && pending.requestId === snapshot.requestId && pending.otpHash === snapshot.otpHash);
const usable = (snapshot: PasswordResetOtpSnapshot, now: Date) => same(snapshot) && pending!.otpExpiresAt > now && pending!.otpAttempts < 5;

beforeEach(() => {
  previousSecret = process.env.OTP_SECRET; process.env.OTP_SECRET = secret;
  pending = fixture(); account = { _id: accountId, email, password: "old-hash", authVersion: 0 }; transactionTail = Promise.resolve();
  jest.spyOn(bcrypt, "hash").mockImplementation((value) => Promise.resolve(`fixture-hash:${String(value)}`) as never);
  jest.spyOn(repository, "findByEmail").mockImplementation(() => Promise.resolve(pending ? { ...pending } : null) as never);
  jest.spyOn(repository, "incrementAttempts").mockImplementation((snapshot, now) => {
    if (!usable(snapshot, now)) return Promise.resolve(null) as never;
    pending!.otpAttempts++; return Promise.resolve({ ...pending }) as never;
  });
  jest.spyOn(repository, "consume").mockImplementation((snapshot, now, tx) => {
    expect(tx).toBe(session);
    if (!usable(snapshot, now)) return Promise.resolve(null) as never;
    const consumed = { ...pending }; pending = null; return Promise.resolve(consumed) as never;
  });
  jest.spyOn(repository, "transaction").mockImplementation(async (work) => {
    // Simulate serialized commits and rollback, like conflicting MongoDB writes.
    let unlock!: () => void;
    const before = transactionTail; transactionTail = new Promise<void>((resolve) => { unlock = resolve; });
    await before;
    const originalOtp = pending ? { ...pending } : null, originalAccount = { ...account };
    try { return await work(session); }
    catch (error) { pending = originalOtp; account = originalAccount; throw error; }
    finally { unlock(); }
  });
  jest.spyOn(repository, "deleteRequest").mockImplementation((snapshot) => {
    const matches = same(snapshot); if (matches) pending = null;
    return Promise.resolve({ deletedCount: Number(matches) }) as never;
  });
  jest.spyOn(repository, "reserve").mockImplementation((data, now) => {
    if (pending && pending.resendAvailableAt > now) return Promise.reject(Object.assign(new Error("duplicate"), { code: 11000 })) as never;
    pending = { ...data }; return Promise.resolve({ ...pending }) as never;
  });
  jest.spyOn(repository, "replaceCode").mockImplementation((snapshot, data, now) => {
    if (!usable(snapshot, now) || pending!.resendAvailableAt > now || pending!.resendCount >= 3) return Promise.resolve(null) as never;
    pending = { ...pending!, ...data, resendCount: pending!.resendCount + 1 };
    return Promise.resolve({ ...pending }) as never;
  });
  jest.spyOn(repository, "restoreAfterSendFailure").mockImplementation((failed, previous) => {
    if (same(failed)) pending = { ...pending!, requestId: previous.requestId, otpHash: previous.otpHash,
      otpExpiresAt: previous.otpExpiresAt, resendAvailableAt: previous.resendAvailableAt, resendCount: pending!.resendCount - 1 };
    return Promise.resolve({ modifiedCount: 1 }) as never;
  });
  jest.spyOn(adminAccountRepository, "findByEmail").mockImplementation(() => Promise.resolve({ ...account }) as never);
  jest.spyOn(adminAccountRepository, "resetPassword").mockImplementation((_id, hash, tx, expectedEmail) => {
    expect(tx).toBe(session); expect(expectedEmail).toBe(email);
    account.password = hash; account.authVersion++; return Promise.resolve({ ...account }) as never;
  });
  jest.spyOn(emailService, "sendPasswordResetOtp").mockResolvedValue();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (previousSecret === undefined) delete process.env.OTP_SECRET; else process.env.OTP_SECRET = previousSecret;
});

it("20 simultaneous wrong guesses count exactly five failures and lock the OTP", async () => {
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => service.verify({ email, code: "999999" })));
  expect(results.every((r) => r.status === "rejected")).toBe(true);
  expect(pending!.otpAttempts).toBe(5);
  expect(results.filter((r) => r.status === "rejected" && r.reason.statusCode === 400)).toHaveLength(4);
  await expect(service.verify({ email, code })).rejects.toMatchObject({ statusCode: 429 });
  await expect(service.reset({ email, code, password })).rejects.toMatchObject({ statusCode: 429 });
  await expect(service.resend(email)).rejects.toMatchObject({ statusCode: 429 });
  expect(adminAccountRepository.resetPassword).not.toHaveBeenCalled();
});
it("a single OTP permits only one of 20 concurrent password resets", async () => {
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => service.reset({ email, code, password })));
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(adminAccountRepository.resetPassword).toHaveBeenCalledTimes(1);
  expect(account.authVersion).toBe(1); expect(pending).toBeNull();
  await expect(service.reset({ email, code, password })).rejects.toMatchObject({ statusCode: 400 });
});
it("verify alone does not consume an OTP, but resetting consumes it", async () => {
  await service.verify({ email, code }); expect(pending).not.toBeNull(); expect(repository.consume).not.toHaveBeenCalled();
  await service.reset({ email, code, password }); expect(pending).toBeNull();
});
it.each(["expired", "locked", "replaced"])("rechecks an OTP that becomes %s while the new password is being hashed", async (mode) => {
  jest.mocked(bcrypt.hash).mockImplementation(async () => {
    if (mode === "expired") pending!.otpExpiresAt = new Date(0);
    if (mode === "locked") pending!.otpAttempts = 5;
    if (mode === "replaced") pending = fixture();
    return "fixture-hash" as never;
  });
  await expect(service.reset({ email, code, password })).rejects.toMatchObject({ statusCode: 400 });
  expect(adminAccountRepository.resetPassword).not.toHaveBeenCalled(); expect(account.authVersion).toBe(0);
});
it.each(["missing-account", "write-failure", "changed-account"])("rolls back OTP consumption on %s", async (mode) => {
  if (mode === "missing-account") jest.mocked(adminAccountRepository.findByEmail).mockResolvedValue(null);
  if (mode === "write-failure") jest.mocked(adminAccountRepository.resetPassword).mockRejectedValue(new Error("database write failed"));
  if (mode === "changed-account") jest.mocked(adminAccountRepository.resetPassword).mockResolvedValue(null);
  await expect(service.reset({ email, code, password })).rejects.toThrow();
  expect(pending).not.toBeNull(); expect(account.authVersion).toBe(0); expect(account.password).toBe("old-hash");
});
it("a stale wrong-guess response cannot increment the new generation", async () => {
  const original = pending!;
  jest.mocked(repository.findByEmail).mockImplementationOnce(() => {
    pending = fixture(); return Promise.resolve({ ...original }) as never;
  });
  await expect(service.verify({ email, code: "999999" })).rejects.toMatchObject({ statusCode: 429 });
  expect(pending!.requestId).not.toBe(original.requestId); expect(pending!.otpAttempts).toBe(0);
});
it("cleanup of an expired generation cannot delete a newer request", async () => {
  const expired = { ...pending!, otpExpiresAt: new Date(0) };
  jest.mocked(repository.findByEmail).mockImplementationOnce(() => {
    pending = fixture(); return Promise.resolve(expired) as never;
  });
  await expect(service.verify({ email, code })).rejects.toMatchObject({ statusCode: 400 }); expect(pending).not.toBeNull();
});
it("preserves prior wrong guesses when resending and issues a different code/generation", async () => {
  const original = { ...pending!, otpAttempts: 3 }; pending = original;
  await service.resend(email);
  expect(pending!.otpAttempts).toBe(3); expect(pending!.resendCount).toBe(1); expect(pending!.requestId).not.toBe(original.requestId);
  const sentCode = jest.mocked(emailService.sendPasswordResetOtp).mock.calls[0]![1];
  expect(sentCode).not.toBe(code); expect(pending!.otpHash).toBe(digest(sentCode, pending!.requestId));
  await service.verify({ email, code: sentCode });
  await expect(service.verify({ email, code })).rejects.toMatchObject({ statusCode: 400 });
  expect(pending!.otpAttempts).toBe(4);
});
it("simultaneous resend requests can issue only one replacement", async () => {
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => service.resend(email)));
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(emailService.sendPasswordResetOtp).toHaveBeenCalledTimes(1); expect(pending!.resendCount).toBe(1);
});
it("restarting the OTP request observes the same cooldown", async () => {
  pending!.resendAvailableAt = new Date(Date.now() + 60_000);
  await expect(service.start({ email })).rejects.toMatchObject({ statusCode: 429 });
  expect(emailService.sendPasswordResetOtp).not.toHaveBeenCalled();
});
it("start stores a generation-bound hash and returns no OTP/hash/internal ID", async () => {
  pending = null;
  const result = await service.start({ email });
  const sentCode = jest.mocked(emailService.sendPasswordResetOtp).mock.calls[0]![1];
  expect(pending!.otpHash).toBe(digest(sentCode, pending!.requestId));
  expect(result).toEqual({ email, expiresInSeconds: 180 });
});
it("initial SMTP failure cannot delete a newer request", async () => {
  pending = null; let newerId: string | undefined;
  jest.mocked(emailService.sendPasswordResetOtp).mockImplementation(async () => {
    pending = fixture(); newerId = pending.requestId; throw new Error("SMTP failed");
  });
  await expect(service.start({ email })).rejects.toThrow("SMTP failed"); expect(pending!.requestId).toBe(newerId);
});
it("failed resend restores the previous code without rolling back newly counted wrong guesses", async () => {
  const previous = { ...pending!, otpAttempts: 2 }; pending = previous;
  jest.mocked(emailService.sendPasswordResetOtp).mockImplementation(async () => {
    pending!.otpAttempts++; throw new Error("SMTP failed");
  });
  await expect(service.resend(email)).rejects.toThrow("SMTP failed");
  expect(pending).toMatchObject({ requestId: previous.requestId, otpHash: previous.otpHash, otpAttempts: 3, resendCount: 0 });
});
it("failed resend cannot restore a consumed/replaced generation", async () => {
  let newerId: string | undefined;
  jest.mocked(emailService.sendPasswordResetOtp).mockImplementation(async () => {
    pending = fixture(); newerId = pending.requestId; throw new Error("SMTP failed");
  });
  await expect(service.resend(email)).rejects.toThrow("SMTP failed"); expect(pending!.requestId).toBe(newerId);
});
it("supports an existing OTP issued before generation IDs were added", async () => {
  delete pending!.requestId; pending!.otpHash = digest(code);
  await service.reset({ email, code, password }); expect(pending).toBeNull();
});
it("fails closed if the transaction cannot start", async () => {
  jest.mocked(repository.transaction).mockRejectedValue(new Error("transaction unavailable"));
  await expect(service.reset({ email, code, password })).rejects.toThrow("transaction unavailable");
  expect(pending).not.toBeNull(); expect(adminAccountRepository.resetPassword).not.toHaveBeenCalled();
});
