export const ACCOUNT_ROLES = ["admin", "manager", "user"] as const;
export const ACCOUNT_STATUSES = ["pending", "active", "inactive"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

// Why an account is locked (status "inactive"): locked by hand, by the employee record
// (left or removed), restored from the trash and waiting to be unlocked, or too many wrong
// passwords ("login-failed": the owner may unlock it with "Quên mật khẩu").
export const ACCOUNT_LOCK_KINDS = ["manual", "employee-left", "employee-deleted", "restored", "login-failed"] as const;
export type AccountLockKind = (typeof ACCOUNT_LOCK_KINDS)[number];
export interface AccountLock {
  kind: AccountLockKind;
  note?: string;
  byName?: string;
  at: Date;
}
export interface AccountActorRef { accountId: string; name: string; email: string }

/** Wrong-password bookkeeping (internal, never returned). See services/admin/login-guard.service.ts. */
export interface AccountLoginGuard {
  /** Wrong passwords in the current round (0-4). */
  count: number;
  /** Rounds of 5 wrong passwords already used: 1 = waited 10 min, 2 = waited 30 min. */
  level: number;
  lastFailedAt?: Date;
  /** Sign-in refused until then. */
  waitUntil?: Date | null;
}

export interface Account {
  authVersion?: number;
  name: string;
  /** Signs in with this (lowercase, unique). New accounts start with their email. */
  username: string;
  email: string;
  phone?: string;
  notes?: string;
  loginGuard?: AccountLoginGuard | null;
  /** Internal unique key for new/changed phone numbers; never returned by API. */
  phoneKey?: string;
  password: string;
  role: AccountRole;
  status: AccountStatus;
  permissionGroupIds?: string[];
  lock?: AccountLock | null;
  /** Soft delete: the account sits in the account trash and cannot sign in. */
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: AccountActorRef;
  /** The person's own picture (user portal). Empty: the HR employee photo is used instead. */
  avatar?: string;
  /** Cloudinary id of avatar; internal, never returned. */
  avatarPublicId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthenticatedAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: AccountStatus;
  role: AccountRole;
  permissions: import("./permission-group.interface").PermissionAction[];
  /** Picture shown for this account: its own, else the linked employee photo, else "". */
  avatar?: string;
}

export interface LoginInput {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterAccountInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface CreateAdminAccountInput extends RegisterAccountInput {
  /** Empty: the email is used. */
  username?: string;
  role: AccountRole;
  permissionGroupIds?: string[];
}

export interface UpdateAdminAccountInput {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  notes?: string;
  role?: AccountRole;
  status?: AccountStatus;
  permissionGroupIds?: string[];
  /** Set by the service, never accepted from clients (Joi strips unknown keys). null clears it. */
  lock?: AccountLock | null;
}

export interface ResetAccountPasswordInput {
  password: string;
  confirmPassword?: string;
  notifyUser?: boolean;
}

export interface AccountResponse {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  notes?: string;
  role: AccountRole;
  status: AccountStatus;
  permissionGroupIds: string[];
  lock: AccountLock | null;
  /** Own picture, else the linked employee photo, else "". */
  avatar?: string;
  deletedAt?: Date;
  deletedBy?: { name: string };
  createdAt?: Date;
  updatedAt?: Date;
}
