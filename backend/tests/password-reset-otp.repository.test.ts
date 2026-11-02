import type { ClientSession } from "mongoose";
import mongoose from "mongoose";
import { passwordResetOtpRepository as repository } from "../src/repositories/admin/password-reset-otp.repository";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import PasswordResetOtpModel from "../src/models/password-reset-otp.model";
import AccountModel from "../src/models/account.model";

const snapshot = { email: "review@asiafnb.com", requestId: "ebed2e4a-b4e8-4b87-9355-5205d3ec6b04", otpHash: "old-otp-hash" };
const now = new Date(), session = {} as ClientSession;
function chain(result: unknown = null) {
  return { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(result) };
}
afterEach(() => jest.restoreAllMocks());

it("atomically increments attempts with generation, expiry and maximum guards", async () => {
  const query = jest.spyOn(PasswordResetOtpModel, "findOneAndUpdate").mockReturnValue(chain() as never);
  await repository.incrementAttempts(snapshot, now);
  expect(query).toHaveBeenCalledWith({ ...snapshot, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: 5 } },
    { $inc: { otpAttempts: 1 } }, { returnDocument: "after" });
});
it("consumes exactly the expected generation within the supplied MongoDB transaction", async () => {
  const query = jest.spyOn(PasswordResetOtpModel, "findOneAndDelete").mockReturnValue(chain() as never);
  await repository.consume(snapshot, now, session);
  expect(query).toHaveBeenCalledWith({ ...snapshot, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: 5 } }, { session });
});
it("legacy OTPs can only match records that still have no generation ID", async () => {
  const query = jest.spyOn(PasswordResetOtpModel, "findOneAndDelete").mockReturnValue(chain() as never);
  await repository.consume({ email: snapshot.email, otpHash: snapshot.otpHash }, now, session);
  expect(query.mock.calls[0]![0]).toMatchObject({ requestId: { $exists: false } });
});
it("resend uses CAS and preserves attempts while enforcing both cooldown and resend count", async () => {
  const query = jest.spyOn(PasswordResetOtpModel, "findOneAndUpdate").mockReturnValue(chain() as never);
  const next = { requestId: "new-generation", otpHash: "new-otp-hash", otpExpiresAt: new Date(Date.now() + 180_000), resendAvailableAt: new Date(Date.now() + 60_000) };
  await repository.replaceCode(snapshot, next, now);
  expect(query).toHaveBeenCalledWith({ ...snapshot, otpExpiresAt: { $gt: now }, resendAvailableAt: { $lte: now }, resendCount: { $lt: 3 }, otpAttempts: { $lt: 5 } },
    { $set: next, $inc: { resendCount: 1 } }, { returnDocument: "after", runValidators: true });
});
it("SMTP rollback restores only the failed generation and never overwrites the attempt counter", async () => {
  const query = jest.spyOn(PasswordResetOtpModel, "updateOne").mockResolvedValue({} as never);
  const previous = { ...snapshot, otpExpiresAt: now, resendAvailableAt: now, otpAttempts: 2, resendCount: 0 };
  const failed = { ...snapshot, requestId: "failed-generation", otpHash: "failed-hash" };
  await repository.restoreAfterSendFailure(failed, previous);
  const [filter, update] = query.mock.calls[0]! as unknown as [Record<string, unknown>, { $set: Record<string, unknown>; $inc: Record<string, number> }];
  expect(filter).toEqual(failed); expect(update.$set).not.toHaveProperty("otpAttempts");
  expect(update.$inc).toEqual({ resendCount: -1 });
});
it("password update and session-version revocation participate in the OTP transaction", async () => {
  const query = jest.spyOn(AccountModel, "findOneAndUpdate").mockReturnValue(chain() as never);
  await adminAccountRepository.resetPassword("507f1f77bcf86cd799439012", "new-password-hash", session, snapshot.email);
  expect(query).toHaveBeenCalledWith({ _id: "507f1f77bcf86cd799439012", email: snapshot.email },
    { $set: { password: "new-password-hash" }, $inc: { authVersion: 1 } }, { returnDocument: "after", runValidators: true, session });
});
it("delegates commit/rollback and write-conflict retry to MongoDB transactions", async () => {
  const transaction = jest.spyOn(mongoose.connection, "transaction").mockResolvedValue("committed" as never);
  const work = jest.fn().mockResolvedValue("result");
  await expect(repository.transaction(work)).resolves.toBe("committed");
  expect(transaction).toHaveBeenCalledWith(work, { readPreference: "primary" });
});
