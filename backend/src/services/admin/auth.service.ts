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

function createAccessToken(admin: AuthenticatedAccount, sid: string, version: number): string {
  return jwt.sign(
    { tokenType: "access", sid, version },
    getJwtSecret(),
    { subject: admin.id, expiresIn: "15m", algorithm: "HS256" },
  );
}

function createRefreshToken(accountId: string, sid: string, version: number, expiresAt: Date, nonce = randomUUID(), issuedAt?: number): string {
  return jwt.sign(
    { tokenType: "refresh", sid, version, exp: Math.floor(expiresAt.getTime() / 1000), ...(issuedAt !== undefined ? { iat: issuedAt } : {}) },
    getJwtSecret(),
    { subject: accountId, jwtid: nonce, algorithm: "HS256" },
  );
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function buildActiveAdmin(accountId: string): Promise<AuthenticatedAccount> {
  const account = await adminAccountRepository.findActiveById(accountId);
  if (!account) {
    throw new AppError(401, "Tài khoản không tồn tại hoặc đã bị khóa");
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
  };
}

export const adminAuthService = {
  async login(data: LoginInput, clientInfo: SessionClientInfo = {}) {
    const account = await adminAccountRepository.findByEmailWithPassword(data.email);
    if (!account) {
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

    if (account.role === "user") {
      throw new AppError(403, "Tài khoản chưa được cấp quyền vào trang quản trị");
    }

    const admin = await buildActiveAdmin(account._id.toString());
    const sid = randomUUID();
    const version = account.authVersion ?? 0;
    const expiresAt = new Date(Date.now() + (data.rememberMe ? AUTH_REMEMBER_LIFETIME_MS : 10 * 60 * 60 * 1000));
    const token = createAccessToken(admin, sid, version);
    const refreshToken = createRefreshToken(admin.id, sid, version, expiresAt);
    await authSessionRepository.create({
      sessionId: sid, accountId: admin.id, authVersion: version,
      persistent: Boolean(data.rememberMe), expiresAt, refreshHash: hashToken(refreshToken),
      ...describeSessionClient(clientInfo), lastSeenAt: new Date(),
    });

    return { admin, token, refreshToken };
  },

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(refreshToken, getJwtSecret(), { algorithms: ["HS256"] }) as RefreshTokenPayload;
    } catch {
      throw new AppError(401, "Phiên ghi nhớ đăng nhập đã hết hạn hoặc không hợp lệ");
    }

    if (payload.tokenType !== "refresh" || !payload.sub || !payload.sid || !Number.isInteger(payload.version)) {
      throw new AppError(401, "Phiên ghi nhớ đăng nhập không hợp lệ");
    }

    const account = await adminAccountRepository.findActiveById(payload.sub);
    const session = await authSessionRepository.findActive(payload.sid, payload.sub);
    if (!account || !session || session.authVersion !== (account.authVersion ?? 0) || payload.version !== session.authVersion) {
      throw new AppError(401, "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.");
    }
    const admin = await buildActiveAdmin(payload.sub);
    const nonce = randomUUID(), issuedAt = Math.floor(Date.now() / 1000);
    let nextRefreshToken = createRefreshToken(admin.id, payload.sid, session.authVersion, session.expiresAt, nonce, issuedAt);
    const previousHash = hashToken(refreshToken);
    const rotated = await authSessionRepository.rotate(payload.sid, admin.id, session.authVersion, previousHash, hashToken(nextRefreshToken), nonce, issuedAt);
    if (!rotated) {
      const latest = await authSessionRepository.findForRefresh(payload.sid, admin.id);
      // Brief idempotency window for simultaneous tabs/retried responses. Return
      // the SAME successor, never create a second branch or extend expiry.
      if (latest && latest.authVersion === session.authVersion && latest.previousRefreshHash === previousHash
        && latest.refreshNonce && latest.refreshedAt !== undefined && issuedAt - latest.refreshedAt <= 5) {
        nextRefreshToken = createRefreshToken(admin.id, payload.sid, session.authVersion, session.expiresAt, latest.refreshNonce, latest.refreshedAt);
      } else {
        await authSessionRepository.revoke(payload.sid, admin.id);
        throw new AppError(401, "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
      }
    }
    return {
      admin, token: createAccessToken(admin, payload.sid, session.authVersion), refreshToken: nextRefreshToken,
      persistent: session.persistent, remainingMs: Math.max(0, session.expiresAt.getTime() - Date.now()),
    };
  },

  async logout(tokens: (string | undefined)[]) {
    for (const token of tokens) {
      if (!token) continue;
      let payload: RefreshTokenPayload;
      try { payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"], ignoreExpiration: true }) as RefreshTokenPayload; }
      catch { continue; }
      if (payload.sid && payload.sub) await authSessionRepository.revoke(payload.sid, payload.sub);
    }
  },
};
