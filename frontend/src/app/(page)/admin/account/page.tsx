"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  BadgeCheck,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { AdminUser, getAdminSession, clearAdminSession } from "@/lib/adminSession";
import { getCurrentUser, setCurrentUser } from "@/app/(page)/admin/Dashboard/utils/storage";
import { UserAccount } from "@/app/(page)/admin/Dashboard/types";

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

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-[#1a7a1a] focus:ring-4 focus:ring-[#1a7a1a]/15";
const LABEL = "mb-1.5 block text-xs font-semibold text-slate-600";
const FIELD_LABEL =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400";
const FIELD_BOX =
  "rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-[#1a7a1a]/40";

/** Green primary action — the logo's green, with a gold-tinted shadow. */
const PRIMARY_BTN =
  "w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#0d5c0d] via-[#1a7a1a] to-[#2d9e2d] text-white font-bold text-sm shadow-lg shadow-[#1a7a1a]/25 flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

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
        alt="Asia Food & Beverage"
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

export default function AccountPage({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");
  const [loading, setLoading] = useState(true);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUserData = () => {
      const admin = getAdminSession();
      const user = getCurrentUser();
      setAdminUser(admin);
      setCurrentUserState(user);
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordError) setPasswordError("");
    if (passwordSuccess) setPasswordSuccess("");
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePasswordForm = () => {
    if (!passwordForm.currentPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại");
      return false;
    }
    if (!passwordForm.newPassword) {
      setPasswordError("Vui lòng nhập mật khẩu mới");
      return false;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự");
      return false;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp");
      return false;
    }
    return true;
  };

  const handleSavePassword = async () => {
    if (!validatePasswordForm()) return;

    setSaving(true);
    setPasswordError("");
    setPasswordSuccess("");

    await new Promise((resolve) => setTimeout(resolve, 800));

    if (currentUser) {
      const updatedUser: UserAccount = {
        ...currentUser,
        password: passwordForm.newPassword,
      };
      setCurrentUser(updatedUser);
      setCurrentUserState(updatedUser);
    }

    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordSuccess("Đổi mật khẩu thành công!");
    setSaving(false);
  };

  const handleLogout = () => {
    clearAdminSession();
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060806]">
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

  const user = currentUser || {
    id: adminUser.id,
    username: adminUser.email.split("@")[0],
    fullName: adminUser.fullName,
    email: adminUser.email,
    phone: "",
    department: "",
    role: adminUser.role,
    status: "approved" as const,
    permissions: {
      canViewDashboard: true,
      canManageEmployees: true,
      canManageMedia: true,
      canManagePermissions: true,
      canExportData: true,
    },
    createdAt: "",
  };

  return (
    <div className="relative min-h-screen text-zinc-200 selection:bg-[#f5c800] selection:text-black">
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

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
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
          <nav className="-mx-3 -mt-3 flex border-b border-slate-200 bg-slate-50 pt-3 sm:-mx-4 sm:-mt-4 sm:pt-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("info")}
              className={`flex-1 px-6 py-4 text-center text-sm font-semibold transition-colors ${
                activeTab === "info"
                  ? "border-b-2 border-black bg-slate-50 text-slate-900"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <User className="mr-1.5 inline-flex h-4 w-4" />
              Thông tin tài khoản
            </button>
            <button
              onClick={() => setActiveTab("password")}
              className={`flex-1 px-6 py-4 text-center text-sm font-semibold transition-colors ${
                activeTab === "password"
                  ? "border-b-2 border-black bg-slate-50 text-slate-900"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <Lock className="mr-1.5 inline-flex h-4 w-4" />
              Đổi mật khẩu
            </button>
          </nav>

            <div className="p-4 sm:p-5">
            {activeTab === "info" && (
              <div className="space-y-4 animate-auth-in">
                <div className="flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#0d5c0d] to-[#2d9e2d] text-xl font-bold text-white shadow-lg shadow-[#1a7a1a]/40 ring-2 ring-[#f5c800]/40">
                    {adminUser.initials}
                  </div>
                  <div className="flex-1 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{adminUser.fullName}</h2>
                      <p className="mt-1 text-sm text-slate-500">{adminUser.email}</p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#f5c800]/30 bg-[#f5c800]/10 px-3 py-1 text-xs font-semibold text-[#f5c800] sm:mt-0">
                      <BadgeCheck className="h-3 w-3" />
                      {adminUser.role}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Mã tài khoản</label>
                    <p className="font-mono text-sm text-slate-800">{user.id}</p>
                  </div>
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Tên đăng nhập</label>
                    <p className="font-medium text-slate-800">{user.username}</p>
                  </div>
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Email</label>
                    <p className="font-medium text-slate-800">{user.email}</p>
                  </div>
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Số điện thoại</label>
                    <p className="font-medium text-slate-800">{user.phone || "Chưa cập nhật"}</p>
                  </div>
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Phòng ban</label>
                    <p className="font-medium text-slate-800">{user.department || "Chưa cập nhật"}</p>
                  </div>
                  <div className={FIELD_BOX}>
                    <label className={FIELD_LABEL}>Trạng thái</label>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : user.status === "pending"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}>
                      {user.status === "approved" && "Đã duyệt"}
                      {user.status === "pending" && "Chờ duyệt"}
                      {user.status === "rejected" && "Đã từ chối"}
                      {user.status === "locked" && "Đã khóa"}
                    </span>
                  </div>
                  <div className={`${FIELD_BOX} sm:col-span-2`}>
                    <label className={FIELD_LABEL}>Quyền hạn</label>
                    <div className="flex flex-wrap gap-2">
                      {user.permissions.canViewDashboard && (
                        <span className="rounded-full border border-[#1a7a1a]/40 bg-[#1a7a1a]/15 px-2.5 py-1 text-xs text-emerald-300">Xem Dashboard</span>
                      )}
                      {user.permissions.canManageEmployees && (
                        <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-xs text-purple-300">Quản lý Nhân sự</span>
                      )}
                      {user.permissions.canManageMedia && (
                        <span className="rounded-full border border-pink-500/30 bg-pink-500/15 px-2.5 py-1 text-xs text-pink-300">Quản lý Truyền thông</span>
                      )}
                      {user.permissions.canManagePermissions && (
                        <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-xs text-red-300">Phân quyền</span>
                      )}
                      {user.permissions.canExportData && (
                        <span className="rounded-full border border-[#f5c800]/30 bg-[#f5c800]/10 px-2.5 py-1 text-xs text-[#f5c800]">Xuất dữ liệu</span>
                      )}
                    </div>
                  </div>
                  {user.createdAt && (
                    <div className={FIELD_BOX}>
                      <label className={FIELD_LABEL}>Ngày tạo tài khoản</label>
                      <p className="font-medium text-slate-800">{user.createdAt}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "password" && (
              <div className="mx-auto max-w-md space-y-6 animate-auth-in">
                <div className="rounded-xl border border-[#f5c800]/25 bg-[#f5c800]/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#f5c800]" />
                    <div className="text-sm text-[#f5c800]">
                      <p className="font-semibold">Lưu ý bảo mật</p>
                      <p className="mt-1">Mật khẩu mới phải khác mật khẩu hiện tại, có ít nhất 8 ký tự. Vui lòng không chia sẻ mật khẩu với bất kỳ ai.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSavePassword(); }} className="space-y-5">
                  <div>
                    <label htmlFor="currentPassword" className={LABEL}>
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.current ? "text" : "password"}
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className={INPUT}
                        placeholder="Nhập mật khẩu hiện tại"
                        autoComplete="current-password"
                      />
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("current")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                        aria-label={showPassword.current ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="newPassword" className={LABEL}>
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.new ? "text" : "password"}
                        id="newPassword"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className={INPUT}
                        placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                        autoComplete="new-password"
                      />
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("new")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                        aria-label={showPassword.new ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {passwordForm.newPassword && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#0d5c0d] via-[#1a7a1a] to-[#f5c800] transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (passwordForm.newPassword.length / 16) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className={LABEL}>
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.confirm ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className={INPUT}
                        placeholder="Nhập lại mật khẩu mới"
                        autoComplete="new-password"
                      />
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("confirm")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                        aria-label={showPassword.confirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {passwordError && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="flex items-center gap-2 rounded-xl border border-[#1a7a1a]/40 bg-[#1a7a1a]/15 p-3 text-sm text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      {passwordSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className={PRIMARY_BTN}
                  >
                    {saving ? (
                      <>
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Lưu mật khẩu mới
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
