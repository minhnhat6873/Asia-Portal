"use client";

import { useEffect, useState } from "react";
import { getAdminSession, type AdminUser } from "./adminSession";
import type { PermissionAction } from "@/services/access-control.service";

export function hasAdminPermission(account: AdminUser | null, permission: PermissionAction): boolean {
  return Boolean(account && (account.role === "Toàn quyền Admin" || account.permissions.includes(permission)));
}

export function useAdminPermissions() {
  const [account, setAccount] = useState<AdminUser | null>(() => getAdminSession());
  useEffect(() => {
    const sync = () => setAccount(getAdminSession());
    window.addEventListener("asia-admin-session", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("asia-admin-session", sync); window.removeEventListener("storage", sync); };
  }, []);
  return { account, can: (permission: PermissionAction) => hasAdminPermission(account, permission) };
}

export function canAccessAdminPath(account: AdminUser | null, pathname: string): boolean {
  if (!account) return false;
  if (pathname.startsWith("/admin/access-control") || pathname.startsWith("/admin/settings")) return account.role === "Toàn quyền Admin";
  const can = (permission: PermissionAction) => hasAdminPermission(account, permission);
  if (pathname === "/admin/employees/trash") return can("employees:trash");
  if (pathname === "/admin/employees/new") return can("employees:create");
  if (/^\/admin\/employees\/[^/]+\/edit$/.test(pathname)) return can("employees:view") && can("employees:update");
  if (pathname.startsWith("/admin/employees")) return can("employees:view");
  if (pathname === "/admin/media/new") return can("media:create");
  if (/^\/admin\/media\/[^/]+\/edit$/.test(pathname)) return can("media:view") && can("media:update");
  if (pathname.startsWith("/admin/media")) return can("media:view");
  if (pathname.startsWith("/admin/meetings")) return can("meetings:view");
  if (pathname === "/admin" || pathname === "/admin/dashboard") return can("dashboard:view");
  return true;
}

export function getAdminLandingPath(account: AdminUser | null): string {
  return ["/admin/dashboard", "/admin/employees", "/admin/employees/trash", "/admin/media", "/admin/meetings", "/admin/employees/new", "/admin/media/new", "/admin/account"].find((path) => canAccessAdminPath(account, path)) ?? "/admin/account";
}
