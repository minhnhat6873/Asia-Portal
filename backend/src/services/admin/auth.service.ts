import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

import {
  type AuthenticatedAccount,
  type LoginInput,
} from "../../interfaces/account.interface";
import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { permissionGroupRepository } from "../../repositories/admin/permission-group.repository";
import { PERMISSION_ACTIONS, filterPermissionActions } from "../../interfaces/permission-group.interface";
import { AppError } from "../../utils/errors/AppError";
import { authSessionRepository } from "../../repositories/admin/auth-session.repository";
import { AUTH_REMEMBER_LIFETIME_MS } from "../../config/auth.config";
import type { SessionClientInfo } from "../../interfaces/auth-session.interface";
import { describeSessionClient } from "../../utils/account/sessionClient";
import { resolveAccountAvatar } from "../../utils/account/accountAvatar";

interface RefreshTokenPayload extends JwtPayload {
  tokenType?: "access" | "refresh";
  sid?: string;
  version?: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new AppError(500, "Máy chủ chưa cấu hình JWT_SECRET");
  }
  return secret;
}

function createAccessToken(admin: AuthenticatedAccount, sid: string, version: number, scope: "admin" | "user" = "admin"): string {
  return jwt.sign(
    { tokenType: "access", sid, version, ...(scope === "user" ? { aud: "asia-user" } : {}) },
    getJwtSecret(),
    { subject: admin.id, expiresIn: "15m", algorithm: "HS256" },
  );
}

function createRefreshToken(accountId: string, sid: string, version: number, expiresAt: Date, nonce = randomUUID(), issuedAt?: number, scope: "admin" | "user" = "admin"): string {
  return jwt.sign(
    { tokenType: "refresh", sid, version, exp: Math.floor(expiresAt.getTime() / 1000), ...(scope === "user" ? { aud: "asia-user" } : {}), ...(issuedAt !== undefined ? { iat: issuedAt } : {}) },
    getJwtSecret(),
    { subject: accountId, jwtid: nonce, algorithm: "HS256" },
  );
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function buildActiveAdmin(accountId: string, scope: "admin" | "user" = "admin"): Promise<AuthenticatedAccount> {
  const account = await adminAccountRepository.findActiveById(accountId);
  if (!account) {
    throw new AppError(401, "Tài khoản không tồn tại hoặc đã bị khóa");
  }

  if (scope === "user") {
    // User-portal sessions never carry admin rights, whatever the account's role.
    return { id: String(account._id), name: account.name, email: account.email, phone: account.phone, status: account.status, role: "user", permissions: [], avatar: await resolveAccountAvatar(account) };
  }
  if (account.role === "user") {
    throw new AppError(403, "Tài khoản chưa được cấp quyền vào trang quản trị");
  }

  const groups = await permissionGroupRepository.findActiveByIds(
    (account.permissionGroupIds ?? []).map((id: unknown) => String(id)),
  );
  const permissions = account.role === "admin"
    ? [...PERMISSION_ACTIONS]
    : filterPermissionActions(groups.flatMap((group) => group.actions));

  return {
    id: account._id.toString(),
    name: account.name,
    email: account.email,
    phone: account.phone,
    status: account.status,
    role: account.role,
    permissions,
    avatar: await resolveAccountAvatar(account),
  };
}

export function createAuthService(scope: "admin" | "user") { return {
  async login(data: LoginInput, clientInfo: SessionClientInfo = {}) {
    const account = await adminAccountRepository.findByEmailWithPassword(data.email);
    // Any account may sign in to the user portal: one person has one company email, so
    // admins use the same account there with user-level access. Only the admin portal
    // restricts by role (checked below).
    if (!account) {
      // Keep missing-account work comparable to a bcrypt password check.
      if (scope === "user") await bcrypt.compare(data.password, "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW");
      throw new AppError(401, "Email hoặc mật khẩu không chính xác");
    }

    const passwordMatches = await bcrypt.compare(data.password, account.password);
    if (!passwordMatches) {
      throw new AppError(401, "Email hoặc mật khẩu không chính xác");
    }

    if (account.status === "pending") {
      throw new AppError(403, "Tài khoản đang chờ admin phê duyệt");
    }

    if (account.status !== "active") {
      throw new AppError(403, "Tài khoản đã bị khóa");
    }

    if (scope === "admin" && account.role === "user") {
      throw new AppError(403, "Tài khoản chưa được cấp quyền vào trang quản trị");
    }

    const admin = await buildActiveAdmin(account._id.toString(), scope);
    const sid = randomUUID();
    const version = account.authVersion ?? 0;
    const expiresAt = new Date(Date.now() + (data.rememberMe ? AUTH_REMEMBER_LIFETIME_MS : 10 * 60 * 60 * 1000));
    const token = createAccessToken(admin, sid, version, scope);
    const refreshToken = createRefreshToken(admin.id, sid, version, expiresAt, undefined, undefined, scope);
    await authSessionRepository.create({
      sessionId: sid, accountId: admin.id, authVersion: version,
      persistent: Boolean(data.rememberMe), expiresAt, refreshHash: hashToken(refreshToken),
      ...describeSessionClient(clientInfo), lastSeenAt: new Date(),
    });

    return { admin, token, refreshToken };
  },

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    const secret = getJwtSecret();
    try {
      payload = jwt.verify(refreshToken, secret, { algorithms: ["HS256"] }) as RefreshTokenPayload;
    } catch {
      throw new AppError(401, "Phiên ghi nhớ đăng nhập đã hết hạn hoặc không hợp lệ");
    }

    if (!payload || typeof payload !== "object" || payload.tokenType !== "refresh" || typeof payload.sub !== "string" || !payload.sub || typeof payload.sid !== "string" || !payload.sid || !Number.isInteger(payload.version)) {
      throw new AppError(401, "Phiên ghi nhớ đăng nhập không hợp lệ");
    }
    if (scope === "user" ? payload.aud !== "asia-user" : payload.aud !== undefined) throw new AppError(401, "Phiên đăng nhập không hợp lệ.");

    const account = await adminAccountRepository.findActiveById(payload.sub);
    const session = await authSessionRepository.findActive(payload.sid, payload.sub);
    if (!account || !session || session.authVersion !== (account.authVersion ?? 0) || payload.version !== session.authVersion) {
      throw new AppError(401, "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.");
    }
    const admin = await buildActiveAdmin(payload.sub, scope);
    const nonce = randomUUID(), issuedAt = Math.floor(Date.now() / 1000);
    let nextRefreshToken = createRefreshToken(admin.id, payload.sid, session.authVersion, session.expiresAt, nonce, issuedAt, scope);
    const previousHash = hashToken(refreshToken);
    const rotated = await authSessionRepository.rotate(payload.sid, admin.id, session.authVersion, previousHash, hashToken(nextRefreshToken), nonce, issuedAt);
    if (!rotated) {
      const latest = await authSessionRepository.findForRefresh(payload.sid, admin.id);
      // Brief idempotency window for simultaneous tabs/retried responses. Return
      // the SAME successor, never create a second branch or extend expiry.
      if (latest && latest.authVersion === session.authVersion && latest.previousRefreshHash === previousHash
        && latest.refreshNonce && latest.refreshedAt !== undefined && issuedAt - latest.refreshedAt <= 5) {
        nextRefreshToken = createRefreshToken(admin.id, payload.sid, session.authVersion, session.expiresAt, latest.refreshNonce, latest.refreshedAt, scope);
      } else {
        await authSessionRepository.revoke(payload.sid, admin.id);
        throw new AppError(401, "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
      }
    }
    return {
      admin, token: createAccessToken(admin, payload.sid, session.authVersion, scope), refreshToken: nextRefreshToken,
      persistent: session.persistent, remainingMs: Math.max(0, session.expiresAt.getTime() - Date.now()),
    };
  },

  async logout(tokens: (string | undefined)[]) {
    for (const token of tokens) {
      if (!token) continue;
      let payload: RefreshTokenPayload;
      try { payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"], ignoreExpiration: true }) as RefreshTokenPayload; }
      catch { continue; }
      if ((scope === "user" ? payload.aud === "asia-user" : payload.aud === undefined) && payload.sid && payload.sub) await authSessionRepository.revoke(payload.sid, payload.sub);
    }
  },
  /** Verifies a user-portal access token and returns the session it belongs to. */
  async authenticate(token: string) {
    let payload: RefreshTokenPayload;
    const secret = getJwtSecret();
    try { payload = jwt.verify(token, secret, { algorithms: ["HS256"], audience: "asia-user" }) as RefreshTokenPayload; }
    catch { throw new AppError(401, "Bạn cần đăng nhập để tiếp tục."); }
    if (payload.tokenType !== "access" || typeof payload.sub !== "string" || !/^[a-f0-9]{24}$/i.test(payload.sub) || typeof payload.sid !== "string" || !Number.isInteger(payload.version)) throw new AppError(401, "Phiên đăng nhập không hợp lệ.");
    const account = await adminAccountRepository.findActiveById(payload.sub);
    const session = await authSessionRepository.findActive(payload.sid, payload.sub);
    if (!account || !session || payload.version !== (account.authVersion ?? 0) || payload.version !== session.authVersion) throw new AppError(401, "Phiên đăng nhập không hợp lệ.");
    const user = await buildActiveAdmin(payload.sub, "user");
    return { user, sessionId: payload.sid, accountRole: account.role, persistent: session.persistent, expiresAt: session.expiresAt };
  },
  async current(token: string) {
    return (await this.authenticate(token)).user;
  },
  /** Signs out every other device of this account; the current session stays. */
  async logoutOthers(accountId: string, sessionId: string) {
    const result = await authSessionRepository.revokeOthers(accountId, sessionId);
    return result.deletedCount ?? 0;
  },
  /**
   * Changes the password, ends every session (authVersion bump), then opens a fresh
   * session for this device so the person stays signed in here.
   */
  async changePassword(accountId: string, currentSession: { persistent: boolean; expiresAt: Date }, currentPassword: string, newPassword: string, clientInfo: SessionClientInfo = {}) {
    const account = await adminAccountRepository.findByIdWithPassword(accountId);
    if (!account || account.status !== "active" || account.isDeleted) throw new AppError(401, "Tài khoản không tồn tại hoặc đã bị khóa");
    if (!(await bcrypt.compare(currentPassword, account.password))) {
      throw new AppError(400, "Mật khẩu hiện tại không chính xác.", { currentPassword: "Mật khẩu hiện tại không chính xác." });
    }
    if (await bcrypt.compare(newPassword, account.password)) {
      throw new AppError(400, "Mật khẩu mới phải khác mật khẩu hiện tại.", { password: "Mật khẩu mới phải khác mật khẩu hiện tại." });
    }
    const updated = await adminAccountRepository.setPasswordIfUnchanged(accountId, account.password, await bcrypt.hash(newPassword, 12));
    if (!updated) throw new AppError(409, "Mật khẩu vừa được thay đổi ở nơi khác. Vui lòng đăng nhập lại.");
    const version = updated.authVersion ?? 0;
    await authSessionRepository.revokeOlderVersions(accountId, version);
    const admin = await buildActiveAdmin(accountId, scope);
    const sid = randomUUID();
    const expiresAt = currentSession.expiresAt.getTime() > Date.now() ? currentSession.expiresAt : new Date(Date.now() + 10 * 60 * 60 * 1000);
    const token = createAccessToken(admin, sid, version, scope);
    const refreshToken = createRefreshToken(admin.id, sid, version, expiresAt, undefined, undefined, scope);
    await authSessionRepository.create({
      sessionId: sid, accountId: admin.id, authVersion: version,
      persistent: currentSession.persistent, expiresAt, refreshHash: hashToken(refreshToken),
      ...describeSessionClient(clientInfo), lastSeenAt: new Date(),
    });
    return { admin, token, refreshToken, persistent: currentSession.persistent, remainingMs: Math.max(0, expiresAt.getTime() - Date.now()) };
  },
}; }

export const adminAuthService = createAuthService("admin");
