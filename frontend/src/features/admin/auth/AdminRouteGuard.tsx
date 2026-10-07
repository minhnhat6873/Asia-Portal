"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { clearAdminSession, setAdminSession } from "@/lib/adminSession";
import {
  getAdminRoleLabel,
  getCurrentAdmin,
  refreshAdminSession,
  type AuthenticatedAdmin,
} from "@/features/admin/login/auth.service";
import { ApiError } from "@/services/api";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/register", "/admin/forgot-password"]);

function storeSession(admin: AuthenticatedAdmin): void {
  setAdminSession({
    id: admin.id,
    email: admin.email,
    fullName: admin.name,
    role: getAdminRoleLabel(admin.role),
  });
}

let pendingSessionVerification: Promise<AuthenticatedAdmin> | null = null;

function verifyAuthenticatedAdmin(): Promise<AuthenticatedAdmin> {
  if (pendingSessionVerification) return pendingSessionVerification;

  pendingSessionVerification = (async () => {
    try {
      return await getCurrentAdmin();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return refreshAdminSession();
      }
      throw error;
    }
  })().finally(() => {
    pendingSessionVerification = null;
  });

  return pendingSessionVerification;
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
        const admin = await verifyAuthenticatedAdmin();
        if (!active) return;
        storeSession(admin);
        setIsCheckingInitialSession(false);
      } catch (error) {
        const sessionRejected = error instanceof ApiError
          && (error.status === 401 || error.status === 403);

        if (sessionRejected) {
          clearAdminSession();
          if (!active) return;
          router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (!active) return;
        setIsCheckingInitialSession(false);
        toast.error(
          error instanceof ApiError && error.status === 429
            ? "Hệ thống đang nhận nhiều yêu cầu. Phiên đăng nhập của bạn vẫn được giữ."
            : "Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại sau.",
        );
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
