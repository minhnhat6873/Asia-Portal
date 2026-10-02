export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  initials: string;
}

export const SESSION_KEY = "asia.admin.session";

export function getAdminSession(): AdminUser | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as Partial<AdminUser> | null;
    if (!parsed?.id || !parsed.email || !parsed.fullName) return null;
    return {
      id: parsed.id,
      email: parsed.email,
      fullName: parsed.fullName,
      role: parsed.role ?? "Quản lý",
      initials: deriveInitials(parsed.fullName),
    };
  } catch {
    return null;
  }
}

export function setAdminSession(user: Omit<AdminUser, "initials">): AdminUser {
  const session: AdminUser = { ...user, initials: deriveInitials(user.fullName) };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event("asia-admin-session"));
  }
  return session;
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("asia-admin-session"));
}

export function deriveInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AF";
  const letters = parts.length === 1
    ? parts[0].slice(0, 2)
    : `${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}`;
  return letters.toUpperCase();
}