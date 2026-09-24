/**
 * Tiny localStorage-backed admin session used by the portal.
 *
 * The real product will replace this with the backend JWT flow
 * (`Asia-Portal/backend/src/controllers/auth.controller.ts`), but the shape
 * below is what the Navbar account menu and the /admin route guard read, so
 * swapping the source later touches only this file.
 */

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  /** Free-form initials shown inside the avatar when no picture is set. */
  initials: string;
}

export const SESSION_KEY = "asia.admin.session";
const ACCOUNTS_KEY = "asia.admin.accounts";

/** Names the built-in admin used before the account was renamed to "admin". */
const LEGACY_ADMIN_NAMES = new Set([
  "Ban Quản Trị Hệ Thống",
  "Quản Trị Viên Hệ Thống",
]);

export interface RegisteredAccount {
  email: string;
  fullName: string;
  phone?: string;
}

const DEFAULT_USER: AdminUser = {
  id: "admin-01",
  fullName: "admin",
  email: "nhanvien@asiafnb.vn",
  role: "Toàn quyền Admin",
  initials: "AD",
};

function loadRegisteredAccounts(): RegisteredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RegisteredAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Remember the họ và tên entered on the register screen, keyed by email. */
export function saveRegisteredAccount(account: RegisteredAccount): void {
  if (typeof window === "undefined") return;
  const email = account.email.trim();
  const fullName = account.fullName.trim();
  if (!email || !fullName) return;

  const next = loadRegisteredAccounts().filter(
    (item) => item.email.toLowerCase() !== email.toLowerCase()
  );
  next.push({
    email,
    fullName,
    phone: account.phone?.trim() || undefined,
  });
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
}

/** Match a login identifier (email or phone) to a name chosen at registration. */
export function findRegisteredAccount(identifier: string): RegisteredAccount | null {
  const key = identifier.trim().toLowerCase();
  if (!key) return null;
  const digits = key.replace(/\D/g, "");

  return (
    loadRegisteredAccounts().find((account) => {
      if (account.email.toLowerCase() === key) return true;
      const phone = (account.phone ?? "").replace(/\D/g, "");
      return digits.length >= 9 && phone.length >= 9 && phone === digits;
    }) ?? null
  );
}

/**
 * Built-in admin stays "admin". Anyone who registered keeps the họ và tên
 * they typed. Older sessions that still say "Ban Quản Trị…" are rewritten.
 */
export function resolveAccountName(identifier: string, storedName?: string): string {
  const registered = findRegisteredAccount(identifier);
  if (registered?.fullName) return registered.fullName;

  const trimmed = storedName?.trim();
  if (trimmed && !LEGACY_ADMIN_NAMES.has(trimmed)) return trimmed;
  return DEFAULT_USER.fullName;
}

/** Reads the stored session, or `null` when nobody is signed in. */
export function getAdminSession(): AdminUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminUser>;
    if (!parsed?.email) return null;

    const fullName = resolveAccountName(parsed.email, parsed.fullName);
    const session: AdminUser = {
      id: parsed.id ?? "admin-01",
      fullName,
      email: parsed.email,
      role: parsed.role ?? DEFAULT_USER.role,
      initials: deriveInitials(fullName),
    };

    if (parsed.fullName !== session.fullName || parsed.initials !== session.initials) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return session;
  } catch {
    return null;
  }
}

/** Persists a session. Called from the login screen on success. */
export function setAdminSession(user: Partial<AdminUser> & { email: string }): AdminUser {
  const fullName = resolveAccountName(user.email, user.fullName);
  const session: AdminUser = {
    id: user.id ?? "admin-01",
    fullName,
    email: user.email,
    role: user.role ?? DEFAULT_USER.role,
    initials: deriveInitials(fullName),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Notify listeners in the same tab (the storage event only fires cross-tab).
    window.dispatchEvent(new Event("asia-admin-session"));
  }

  return session;
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("asia-admin-session"));
}

/** "Nguyễn Văn An" -> "NA" (last two given-name words). */
export function deriveInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AF";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}`;
  return letters.toUpperCase();
}
