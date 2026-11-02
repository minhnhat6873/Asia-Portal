export interface AuthSession {
  sessionId: string;
  accountId: string;
  authVersion: number;
  persistent: boolean;
  refreshHash?: string;
  previousRefreshHash?: string;
  refreshNonce?: string;
  refreshedAt?: number;
  expiresAt: Date;
  ipAddress?: string;
  lastIpAddress?: string;
  browser?: string;
  operatingSystem?: string;
  lastSeenAt?: Date;
  createdAt?: Date;
}

export interface SessionClientInfo {
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionListQuery {
  accountId?: string;
  page?: string;
  limit?: string;
}
