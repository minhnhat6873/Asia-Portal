import type { ReactNode } from "react";

import AdminRouteGuard from "@/features/admin/auth/AdminRouteGuard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteGuard>{children}</AdminRouteGuard>;
}