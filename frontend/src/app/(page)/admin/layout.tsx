import type { ReactNode } from "react";

import AdminRouteGuard from "@/features/admin/auth/AdminRouteGuard";
import { RecoveryProvider } from "@/features/auth/RecoveryContext";
import AdminShell from "@/features/admin/dashboard/AdminShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RecoveryProvider><AdminRouteGuard><AdminShell>{children}</AdminShell></AdminRouteGuard></RecoveryProvider>;
}