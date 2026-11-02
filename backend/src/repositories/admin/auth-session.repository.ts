import AuthSessionModel from "../../models/auth-session.model";
import type { AuthSession } from "../../interfaces/auth-session.interface";

export const authSessionRepository = {
  create(data: AuthSession) {
    return AuthSessionModel.create(data);
  },
  findActive(sessionId: string, accountId: string) {
    return AuthSessionModel.findOne({ sessionId, accountId, expiresAt: { $gt: new Date() } }).lean();
  },
  findForRefresh(sessionId: string, accountId: string) {
    return AuthSessionModel.findOne({ sessionId, accountId, expiresAt: { $gt: new Date() } })
      .select("+previousRefreshHash +refreshNonce").lean();
  },
  rotate(sessionId: string, accountId: string, authVersion: number, previousHash: string, nextHash: string, refreshNonce: string, refreshedAt: number) {
    // Compare-and-swap: a refresh token can only be consumed once.
    return AuthSessionModel.findOneAndUpdate(
      { sessionId, accountId, authVersion, refreshHash: previousHash, expiresAt: { $gt: new Date() } },
      { $set: { refreshHash: nextHash, previousRefreshHash: previousHash, refreshNonce, refreshedAt } }, { returnDocument: "after" },
    ).lean();
  },
  revoke(sessionId: string, accountId: string) {
    return AuthSessionModel.deleteOne({ sessionId, accountId });
  },
  touch(sessionId: string, accountId: string, lastIpAddress?: string) {
    const now = new Date();
    return AuthSessionModel.updateOne({
      sessionId, accountId,
      $or: [{ lastSeenAt: { $lt: new Date(now.getTime() - 60_000) } }, { lastSeenAt: { $exists: false } }],
    }, { $set: { lastSeenAt: now, ...(lastIpAddress ? { lastIpAddress } : {}) } });
  },
  list(accountId: string, authVersion: number, skip: number, limit: number) {
    return AuthSessionModel.find({ accountId, authVersion, expiresAt: { $gt: new Date() } })
      .select("_id sessionId ipAddress lastIpAddress browser operatingSystem createdAt lastSeenAt expiresAt persistent")
      .sort({ lastSeenAt: -1, createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean();
  },
  count(accountId: string, authVersion: number) {
    return AuthSessionModel.countDocuments({ accountId, authVersion, expiresAt: { $gt: new Date() } });
  },
  findById(id: string, accountId: string) {
    return AuthSessionModel.findOne({ _id: id, accountId }).lean();
  },
  revokeById(id: string, accountId: string) {
    return AuthSessionModel.deleteOne({ _id: id, accountId });
  },
  revokeOthers(accountId: string, currentSessionId: string) {
    return AuthSessionModel.deleteMany({ accountId, sessionId: { $ne: currentSessionId } });
  },
  revokeOlderVersions(accountId: string, authVersion: number) {
    return AuthSessionModel.deleteMany({ accountId, authVersion: { $lt: authVersion } });
  },
};
