import type { AuthenticatedAccount } from "../../interfaces/account.interface";
import type { SessionListQuery } from "../../interfaces/auth-session.interface";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { authSessionRepository } from "../../repositories/admin/auth-session.repository";
import { AppError } from "../../utils/errors/AppError";
import { auditLogService } from "./audit-log.service";

async function resolveAccount(actor: AuthenticatedAccount, accountId?: string) {
  const id = (accountId ?? actor.id).toLowerCase();
  if (!/^[a-f\d]{24}$/.test(id)) throw new AppError(400, "Mã tài khoản không hợp lệ.");
  if (id !== actor.id.toLowerCase() && actor.role !== "admin") {
    throw new AppError(403, "Bạn chỉ được quản lý phiên đăng nhập của chính mình.");
  }
  const account = await adminAccountRepository.findForSessions(id);
  if (!account) throw new AppError(404, "Không tìm thấy tài khoản.");
  return { id, account };
}

async function record(actor: AuthenticatedAccount, accountId: string, action: "session.revoked" | "session.revoked_others" | "session.revoked_all") {
  await auditLogService.record({
    actor: { accountId: actor.id, name: actor.name, email: actor.email },
    action, entityType: "account", entityId: accountId,
    description: action === "session.revoked" ? "Thu hồi một phiên đăng nhập."
      : action === "session.revoked_others" ? "Thu hồi các phiên đăng nhập khác." : "Thu hồi tất cả phiên đăng nhập.",
  });
}

export const adminSessionService = {
  async list(actor: AuthenticatedAccount, currentSessionId: string, query: SessionListQuery) {
    const { id, account } = await resolveAccount(actor, query.accountId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    if (account.status !== "active" || account.role === "user") {
      return { account: { id, name: account.name, email: account.email }, items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    const version = account.authVersion ?? 0;
    const [sessions, total] = await Promise.all([
      authSessionRepository.list(id, version, (page - 1) * limit, limit),
      authSessionRepository.count(id, version),
    ]);
    return {
      account: { id, name: account.name, email: account.email },
      items: sessions.map((session) => ({
        id: String(session._id),
        isCurrent: id === actor.id.toLowerCase() && session.sessionId === currentSessionId,
        browser: session.browser ?? "Chưa xác định",
        operatingSystem: session.operatingSystem ?? "Chưa xác định",
        ipAddress: session.ipAddress ?? null, lastIpAddress: session.lastIpAddress ?? session.ipAddress ?? null,
        createdAt: session.createdAt ?? null, lastSeenAt: session.lastSeenAt ?? session.createdAt ?? null,
        expiresAt: session.expiresAt, persistent: session.persistent,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
  async revokeOne(actor: AuthenticatedAccount, currentSessionId: string, sessionRecordId: string, accountId?: string) {
    if (!/^[a-f\d]{24}$/i.test(sessionRecordId)) throw new AppError(400, "Mã phiên đăng nhập không hợp lệ.");
    const { id } = await resolveAccount(actor, accountId);
    const session = await authSessionRepository.findById(sessionRecordId, id);
    if (!session) throw new AppError(404, "Phiên đã kết thúc hoặc không còn tồn tại.");
    await authSessionRepository.revokeById(sessionRecordId, id);
    await record(actor, id, "session.revoked");
    return { signedOut: id === actor.id.toLowerCase() && session.sessionId === currentSessionId };
  },
  async revokeMany(actor: AuthenticatedAccount, currentSessionId: string, scope: "others" | "all", accountId?: string) {
    const { id } = await resolveAccount(actor, accountId);
    if (scope === "others") {
      if (id !== actor.id.toLowerCase()) throw new AppError(400, "Chỉ có thể giữ lại phiên hiện tại của chính bạn.");
      await authSessionRepository.revokeOthers(id, currentSessionId);
    } else {
      // Atomic version bump invalidates all existing access AND refresh tokens.
      // Cleanup only older versions so a new concurrent login is not deleted.
      const updated = await adminAccountRepository.revokeAllSessions(id);
      if (!updated) throw new AppError(404, "Không tìm thấy tài khoản.");
      await authSessionRepository.revokeOlderVersions(id, updated.authVersion ?? 0).catch(() => undefined);
    }
    await record(actor, id, scope === "all" ? "session.revoked_all" : "session.revoked_others");
    return { signedOut: scope === "all" && id === actor.id.toLowerCase() };
  },
};
