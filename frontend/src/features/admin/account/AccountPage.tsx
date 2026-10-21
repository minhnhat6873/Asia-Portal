"use client";

import { useDelayedLoading } from "@/lib/useDelayedLoading";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  BadgeCheck,
  Lock,
  Mail,
} from "lucide-react";
import { type AdminUser, getAdminSession, clearAdminSession } from "@/lib/adminSession";
import { logoutAdmin } from "@/features/admin/login/auth.service";
import { EmailChangeForm } from "./EmailChangeForm";
import { PasswordChangeForm } from "./PasswordChangeForm";
import { PermissionGroupBadge } from "@/features/access-control/components/PermissionGroupBadge";

/* ========================================================================== *
 * Shared brand styles — mirrors the /admin/login canvas so the account screen
 * reads as the same product: black canvas, green primary, gold accent.
 *   --wana-green       #1a7a1a   primary
 *   --wana-green-dark  #0d5c0d   gradients
 *   --wana-yellow      #f5c800   accent (the gold ring in the logo)
 * ========================================================================== */

const CARD =
  "relative rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 transition-all duration-300 sm:p-4";

/** Gradient highlight pinned to a card's top edge; `via` sets the hue. */
function cardAccent(via = "via-[#1a7a1a]/70") {
  return `absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent ${via} to-transparent`;
}

const FIELD_LABEL =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400";
const FIELD_BOX =
  "rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-[#1a7a1a]/40";

/**
 * The Asia F&B round badge — identical treatment to the login screen. The PNG
 * has a light background, so it sits on a white disc ringed in gold.
 */
function BrandBadge({ size = 84 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative mx-auto mb-4 overflow-hidden rounded-full bg-white ring-2 ring-[#f5c800]/40 shadow-lg shadow-black/40"
    >
      <Image
        src="/assets/images/asia-logo.png"
        alt="Asia Food & Beverage co.ltd"
        fill
        priority
        sizes={`${size}px`}
        className="object-contain"
      />
    </div>
  );
}

/** Ambient black canvas with drifting green + gold orbs, as on the login page. */
function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#060806]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1410] via-[#060806] to-[#0b0a04]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#1a7a1a_1px,transparent_1px)] [background-size:26px_26px]" />
      <div
        style={{ animation: "asia-orb-drift 18s ease-in-out infinite" }}
        className="absolute -left-32 -top-36 h-96 w-96 rounded-full bg-gradient-to-tr from-[#1a7a1a]/25 via-[#f5c800]/10 to-transparent blur-3xl sm:h-[500px] sm:w-[500px]"
      />
      <div
        style={{ animation: "asia-orb-drift 22s ease-in-out 2s infinite reverse" }}
        className="absolute -bottom-40 -right-36 h-96 w-96 rounded-full bg-gradient-to-br from-[#f5c800]/12 via-[#1a7a1a]/15 to-transparent blur-3xl sm:h-[540px] sm:w-[540px]"
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1a7a1a]/60 to-transparent" />
    </div>
  );
}

export default function AccountPage({
  embedded = false,
  initialAdminUser = null,
}: { embedded?: boolean; initialAdminUser?: AdminUser | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(initialAdminUser);
  const pathname = usePathname();
  const activeTab = pathname.endsWith("/change-email") ? "email" : searchParams.get("tab") === "password" ? "password" : "info";
  const [loading, setLoading] = useState(!initialAdminUser);


  useEffect(() => {
    const loadUserData = () => {
      const admin = getAdminSession();
      setAdminUser(admin);
      setLoading(false);
    };
    loadUserData();

    const handleStorageChange = () => loadUserData();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("asia-admin-session", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("asia-admin-session", handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    void logoutAdmin().finally(() => { clearAdminSession(); router.push("/admin/login"); });
  };

  const showLoading = useDelayedLoading(loading);

  if (loading) {
    return (
      <div hidden={!showLoading} role="status" className="flex min-h-screen items-center justify-center bg-[#060806]">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-wana-green border-t-transparent" />
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060806]">
        <p className="text-zinc-500">Không tìm thấy thông tin tài khoản</p>
      </div>
    );
  }

  const isRootAdmin = adminUser.role === "Toàn quyền Admin";

  return (
    <div className={`relative min-w-0 ${embedded ? "min-h-0" : "min-h-screen"} text-zinc-200 selection:bg-[#f5c800] selection:text-black`}>
      <AmbientBackground />

      {!embedded && <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060806]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-[#f5c800]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại trang quản trị</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-zinc-400 sm:block">
                {adminUser.fullName}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
              >
                <Lock className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>}

      <main className={`mx-auto w-full min-w-0 max-w-3xl py-4 ${embedded ? "px-0" : "px-4 sm:px-6"}`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandBadge size={72} />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c800]/25 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-[#f5c800]">
            <BadgeCheck className="h-3.5 w-3.5" />
            <span>Asia Internal Portal</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-black sm:text-3xl">
            Tài khoản của tôi
          </h1>
          <p className="mt-1.5 text-sm text-slate-800">
            Quản lý thông tin cá nhân và bảo mật tài khoản
          </p>
        </div>

        <div className={`${CARD} overflow-hidden`}>
          <div className={cardAccent()} />
          <nav className="-mx-3 -mt-3 flex border-b border-slate-200 bg-slate-50 pt-3 sm:-mx-4 sm:-mt-4 sm:pt-4" aria-label="Tài khoản của tôi">
            {([
              { id: "info", href: "/admin/account", label: "Thông tin tài khoản", Icon: User },
              { id: "password", href: "/admin/account?tab=password", label: "Đổi mật khẩu", Icon: Lock },
              { id: "email", href: "/admin/account/change-email", label: "Đổi email", Icon: Mail },
            ] as const).map(({ id, href, label, Icon }) => <Link key={id} href={href} aria-current={activeTab === id ? "page" : undefined} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-b-2 px-2 py-4 text-center text-sm font-semibold transition-colors sm:flex-row sm:gap-2 ${activeTab === id ? "border-black text-slate-900" : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{label}
            </Link>)}
          </nav>

            <div className="p-4 sm:p-5">
            {activeTab === "info" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#0d5c0d] to-[#2d9e2d] text-2xl sm:text-xl font-bold text-white shadow-lg shadow-[#1a7a1a]/40 ring-2 ring-[#f5c800]/40">
                    {adminUser.initials}
                  </div>
                  <div className="w-full min-w-0 flex-1 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
                    <div>
                      <h2 className="break-words text-2xl sm:text-xl font-bold text-slate-900">{adminUser.fullName}</h2>
                      <p className="mt-1 break-all text-base sm:text-sm text-slate-500">{adminUser.email}</p>
                    </div>
                    <div className="mt-3 max-sm:[&>span]:text-base sm:mt-0"><PermissionGroupBadge name={isRootAdmin ? "Admin gốc" : "Quản lý"} color={isRootAdmin ? "orange" : "blue"} icon={isRootAdmin ? "crown" : "user"} /></div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Họ và tên</label>
                    <p className="break-words font-medium text-slate-800">{adminUser.fullName}</p>
                  </div>
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Email</label>
                    <p className="break-all font-medium text-slate-800">{adminUser.email}</p>
                  </div>
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Số điện thoại</label>
                    <p className="font-medium text-slate-800">{adminUser.phone || "Chưa cập nhật"}</p>
                  </div>
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Trạng thái</label>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      adminUser.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : adminUser.status === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : adminUser.status === "inactive"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {adminUser.status === "active" && "Đang hoạt động"}
                      {adminUser.status === "pending" && "Chờ duyệt"}
                      {adminUser.status === "inactive" && "Tạm khóa"}
                      {!adminUser.status && "Chưa cập nhật"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "password" && <PasswordChangeForm />}
            {activeTab === "email" && <EmailChangeForm currentEmail={adminUser.email} />}
          </div>
        </div>
      </main>
    </div>
  );
}
