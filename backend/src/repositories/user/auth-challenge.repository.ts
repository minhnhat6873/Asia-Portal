import mongoose, { type ClientSession } from "mongoose";
import Challenge from "../../models/user-auth-challenge.model";
import AccountModel from "../../models/account.model";
import type { UserAuthChallenge, UserOtpPurpose } from "../../interfaces/user-auth.interface";
import { accountPhonePattern } from "../../utils/account/normalizeContact";

/** May reset the password: active or waiting accounts, and an Admin gốc locked only by wrong passwords. */
const RESETTABLE = { isDeleted: { $ne: true }, $or: [{ status: { $in: ["active", "pending"] } }, { role: "admin", status: "inactive", "lock.kind": "login-failed" }] };
const generation = (value: UserAuthChallenge) => ({ email: value.email, purpose: value.purpose, requestId: value.requestId, otpHash: value.otpHash });
export const userAuthChallengeRepository = {
  find(email: string, purpose: UserOtpPurpose) {
    return Challenge.findOne({ email, purpose }).select("+otpHash +passwordHash").lean();
  },
  // Any role: admins share the account (and password) used in the user portal.
  findAccount(email: string) {
    return AccountModel.findOne({ email, ...RESETTABLE }).select("+authVersion").lean();
  },
  contactExists(email: string, phone: string) {
    return AccountModel.exists({ $or: [{ email }, { phone: accountPhonePattern(phone) }, { phoneKey: phone }] });
  },
  async reserve(value: UserAuthChallenge) {
    await Challenge.init();
    return Challenge.findOneAndUpdate({ email: value.email, purpose: value.purpose, expiresAt: { $lte: new Date() } }, { $set: value },
      { upsert: true, returnDocument: "after" }).select("+otpHash +passwordHash").lean();
  },
  fail(value: UserAuthChallenge) {
    return Challenge.findOneAndUpdate({ ...generation(value), expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { returnDocument: "after" }).lean();
  },
  replace(value: UserAuthChallenge, next: Pick<UserAuthChallenge, "requestId" | "otpHash" | "expiresAt" | "resendAvailableAt">) {
    return Challenge.findOneAndUpdate({ ...generation(value), expiresAt: { $gt: new Date() }, attempts: { $lt: 5 }, resendCount: { $lt: 3 }, resendAvailableAt: { $lte: new Date() } },
      { $set: next, $inc: { resendCount: 1 } }, { returnDocument: "after" }).select("+otpHash +passwordHash").lean();
  },
  restore(value: UserAuthChallenge, previous: UserAuthChallenge) {
    return Challenge.updateOne(generation(value), { $set: { requestId: previous.requestId, otpHash: previous.otpHash, expiresAt: previous.expiresAt, resendAvailableAt: previous.resendAvailableAt }, $inc: { resendCount: -1 } });
  },
  remove(value: UserAuthChallenge) { return Challenge.deleteOne(generation(value)); },
  consume(value: UserAuthChallenge, session: ClientSession) {
    return Challenge.findOneAndDelete({ ...generation(value), expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }, { session }).select("+passwordHash").lean();
  },
  async createAccount(value: UserAuthChallenge, session: ClientSession) {
    const account = new AccountModel({ name: value.name, email: value.email, phone: value.phone, password: value.passwordHash, role: "user", status: "pending", permissionGroupIds: [] });
    account.$locals.passwordAlreadyHashed = true;
    return account.save({ session });
  },
  resetPassword(value: UserAuthChallenge, password: string, session: ClientSession) {
    return AccountModel.findOneAndUpdate({ _id: value.accountId, email: value.email, ...RESETTABLE, authVersion: value.authVersion === 0 ? { $in: [0, null] } : value.authVersion },
      { $set: { password, loginGuard: null }, $inc: { authVersion: 1 } }, { session, returnDocument: "after" }).lean();
  },
  async transaction<T>(work: (session: ClientSession) => Promise<T>) {
    await AccountModel.init();
    return mongoose.connection.transaction(work, { readPreference: "primary" });
  },
};
