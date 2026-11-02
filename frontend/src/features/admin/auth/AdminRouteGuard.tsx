"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import AccessDenied from "./AccessDenied";
import { LoaderCircle } from "lucide-react";
import { canAccessAdminPath, getAdminLandingPath } from "@/lib/adminPermissions";
import { type AdminUser, clearAdminSession, setAdminSession } from "@/lib/adminSession";
import {
  getAdminRoleLabel,
  getCurrentAdmin,
  refreshAdminSession,
  type AuthenticatedAdmin,
} from "@/features/admin/login/auth.service";
import { ApiError } from "@/services/api";
import { createSessionVerifier, SessionVerificationTimeoutError } from "./session-verification";

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

const verifyAuthenticatedAdmin = createSessionVerifier({
  getCurrentAdmin,
  refreshAdminSession,
  isUnauthorized: (error) => error instanceof ApiError && error.status === 401,
});

export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPage = PUBLIC_ADMIN_PATHS.has(pathname);
  const [verified, setVerified] = useState<AdminUser | null>(null);
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
        setVerified(account);
        setErrorMessage("");
        ["asia_fnb_users_v2", "asia_fnb_current_user_v2", "asia_fnb_trash_v1", "asia_fnb_access_control_users_v1", "asia_fnb_access_control_roles_v1"].forEach((key) => localStorage.removeItem(key));

      } catch (error) {
        if (!active) return;
        const sessionRejected = error instanceof ApiError
          && (error.status === 401 || error.status === 403);

        if (sessionRejected) {
          clearAdminSession();
          setVerified(null);
          setErrorMessage("");
          router.replace(`/admin/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }

        setErrorMessage(
          error instanceof ApiError && error.status === 429
            ? "Hệ thống đang nhận nhiều yêu cầu. Phiên đăng nhập của bạn vẫn được giữ."
            : error instanceof SessionVerificationTimeoutError
              ? error.message
              : "Không thể kiểm tra phiên đăng nhập. Vui lòng kiểm tra kết nối và thử lại.",
        );
      }
    }

    // Verify the current route before mounting protected content.
    void verifySession();
    const refresh = () => { if (document.visibilityState === "visible") void verifySession(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { active = false; window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); window.clearInterval(timer); };
  }, [isPublicPage, router, retry]);

  if (isPublicPage) return <>{children}</>;
  if (errorMessage && !verified) return <div role="alert" className="p-8 text-slate-700"><p>{errorMessage}</p><button onClick={() => { setErrorMessage(""); setRetry((value) => value + 1); }} className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 text-white">Thử lại</button></div>;
  if (!verified) return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex h-dvh items-center justify-center gap-2.5 bg-admin-main text-sm text-slate-500">
      <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-emerald-600 motion-reduce:animate-none" />
      <span>Đang tải trang...</span>
    </div>
  );

  if (!canAccessAdminPath(verified, pathname)) return <AccessDenied returnHref={getAdminLandingPath(verified)} />;
  return <>{errorMessage && <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p>{errorMessage}</p><button type="button" onClick={() => { setErrorMessage(""); setRetry((value) => value + 1); }} className="font-bold underline">Thử lại</button></div>}{children}</>;
}
