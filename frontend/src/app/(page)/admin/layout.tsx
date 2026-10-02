import type { ReactNode } from "react";

import AdminRouteGuard from "@/features/admin/auth/AdminRouteGuard";
import AdminShell from "@/features/admin/dashboard/AdminShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteGuard><AdminShell>{children}</AdminShell></AdminRouteGuard>;
}