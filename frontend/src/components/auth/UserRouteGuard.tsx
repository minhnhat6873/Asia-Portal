"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { loginHref } from "@/lib/safeRedirect";
import { useUserSession } from "@/lib/userSession";

/**
 * Every page under /user needs a signed-in account. The proxy already sends visitors
 * without a session cookie to /login; this also covers an expired or revoked session,
 * which is only known after asking the server. The API refuses guests on its own.
 *
 * The page is rendered while the session is still being checked (as on the server), so
 * Next.js hydrates it normally; holding it back until the check finished made the page
 * mount later and Next.js log "called use() to suspend ... did not call use()".
 */
export default function UserRouteGuard({ children }: { children: ReactNode }) {
  const guest = useUserSession().status === "guest";
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (guest) router.replace(loginHref(`${pathname}${window.location.search}${window.location.hash}`));
  }, [guest, pathname, router]);

  if (!guest) return children;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div role="status" className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        Phiên đăng nhập đã hết, đang chuyển đến trang đăng nhập…
      </div>
    </main>
  );
}
