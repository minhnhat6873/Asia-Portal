"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { clearAdminSession, setAdminSession } from "@/lib/adminSession";
import {
  getAdminRoleLabel,
  getCurrentAdmin,
  refreshAdminSession,
  type AuthenticatedAdmin,
} from "@/features/admin/login/auth.service";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/register"]);

function storeSession(admin: AuthenticatedAdmin): void {
  setAdminSession({
    id: admin.id,
    email: admin.email,
    fullName: admin.name,
    role: getAdminRoleLabel(admin.role),
  });
}

export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPage = PUBLIC_ADMIN_PATHS.has(pathname);
  const [isCheckingInitialSession, setIsCheckingInitialSession] = useState(!isPublicPage);

  useEffect(() => {
    if (isPublicPage) {
      setIsCheckingInitialSession(false);
      return;
    }

    let active = true;
    async function verifySession() {
      try {
        const admin = await getCurrentAdmin();
        if (!active) return;
        storeSession(admin);
        setIsCheckingInitialSession(false);
      } catch {
        try {
          const admin = await refreshAdminSession();
          if (!active) return;
          storeSession(admin);
          setIsCheckingInitialSession(false);
        } catch {
          clearAdminSession();
          if (!active) return;
          router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        }
      }
    }

    // Chạy mỗi lần route admin thay đổi. Sau lần đầu, children vẫn hiển thị
    // trong lúc kiểm tra để không tạo màn hình trắng khi điều hướng.
    void verifySession();
    return () => { active = false; };
  }, [isPublicPage, pathname, router]);

  if (isPublicPage) return <>{children}</>;
  if (isCheckingInitialSession) return <div className="min-h-screen bg-slate-50" aria-busy="true" />;

  return <>{children}</>;
}