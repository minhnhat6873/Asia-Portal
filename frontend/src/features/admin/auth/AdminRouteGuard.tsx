"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Link from "next/link";
import { canAccessAdminPath, getAdminLandingPath } from "@/lib/adminPermissions";
import { type AdminUser, clearAdminSession, setAdminSession } from "@/lib/adminSession";
import {
  getAdminRoleLabel,
  getCurrentAdmin,
  refreshAdminSession,
  type AuthenticatedAdmin,
} from "@/features/admin/login/auth.service";
import { ApiError } from "@/services/api";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/forgot-password", "/admin/register"]);

function storeSession(admin: AuthenticatedAdmin): AdminUser {
  return setAdminSession({
    id: admin.id,
    email: admin.email,
    fullName: admin.name,
    phone: admin.phone,
    status: admin.status,
    role: getAdminRoleLabel(admin.role),
    permissions: admin.permissions,
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
  const [verified, setVerified] = useState<{path: string; account: AdminUser} | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (isPublicPage) {
      return;
    }

    let active = true;
    async function verifySession() {
      try {
        const admin = await verifyAuthenticatedAdmin();
        if (!active) return;
        const account = storeSession(admin);
        setVerified({path: pathname, account});
        setErrorMessage("");
        ["asia_fnb_users_v2", "asia_fnb_current_user_v2", "asia_fnb_trash_v1", "asia_fnb_access_control_users_v1", "asia_fnb_access_control_roles_v1"].forEach((key) => localStorage.removeItem(key));

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
        setVerified(null);
        setErrorMessage(
          error instanceof ApiError && error.status === 429
            ? "Hệ thống đang nhận nhiều yêu cầu. Phiên đăng nhập của bạn vẫn được giữ."
            : "Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại sau.",
        );
      }
    }

    // Verify the current route before mounting protected content.
    void verifySession();
    const refresh = () => { if (document.visibilityState === "visible") void verifySession(); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { active = false; window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [isPublicPage, pathname, router, retry]);

  if (isPublicPage) return <>{children}</>;
  if (errorMessage) return <div className="p-8 text-slate-700"><p>{errorMessage}</p><button onClick={() => { setErrorMessage(""); setRetry((value) => value + 1); }} className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 text-white">Thử lại</button></div>;
  if (!verified || verified.path !== pathname) return <div className="min-h-screen bg-slate-50" aria-busy="true" />;

  if (!canAccessAdminPath(verified.account, pathname)) return <div className="min-h-screen bg-slate-50 p-8"><h1 className="text-xl font-bold">Bạn chưa được cấp quyền truy cập trang này.</h1><Link href={getAdminLandingPath(verified.account)} className="mt-4 inline-block text-emerald-700 underline">Về trang được cấp quyền</Link></div>;
  return <>{children}</>;
}
