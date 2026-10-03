"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import AdminDashboard from "./AdminDashboard";

const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/register",
  "/admin/forgot-password",
]);

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return <>{children}</>;

  // The shell stays mounted while a child admin route changes. This keeps the
  // header, sidebar, loaded data and scroll container from being rebuilt.
  return <AdminDashboard />;
}
