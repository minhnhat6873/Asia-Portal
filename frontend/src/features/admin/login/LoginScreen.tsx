"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  UserRound,
  Sparkles,
} from "lucide-react";
import { getAdminLandingPath } from "@/lib/adminPermissions";
import { getAdminSession, setAdminSession } from "@/lib/adminSession";
import {
  getAdminRoleLabel,
  loginAdmin,
} from "@/features/admin/login/auth.service";
import { ApiError } from "@/services/api";
import AuthFrame from "@/features/admin/auth/AuthFrame";
import { showToast } from "@/features/admin/auth/notify";
import {
  CARD,
  cardAccent,
  LABEL,
  ERROR_TEXT,
  PRIMARY_BTN,
  EYEBROW,
  TITLE,
  SUBTITLE,
  LINK,
  ButtonSpinner,
  FloatingField,
  BrandBadge,
} from "@/features/admin/auth/AuthElements";
function LoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) errs.identifier = "Vui lòng nhập tên đăng nhập";
    if (!password) errs.password = "Vui lòng nhập mật khẩu";

    setErrors(errs);
    if (Object.keys(errs).length) {
      showToast(
        "Thông tin chưa hợp lệ",
        "Vui lòng kiểm tra lại các trường bắt buộc.",
        "error",
      );
      return;
    }

    setIsLoading(true);
    try {
      const admin = await loginAdmin({
        username: identifier.trim(),
        password,
        rememberMe,
      });
      setAdminSession({
        id: admin.id,
        email: admin.email,
        fullName: admin.name,
        phone: admin.phone,
        status: admin.status,
        role: getAdminRoleLabel(admin.role),
        permissions: admin.permissions,
        avatar: admin.avatar,
      });
      showToast(
        "Đăng nhập thành công!",
        "Chào mừng bạn quay lại cổng thông tin nội bộ Asia F&B.",
        "success",
      );
      router.replace(getAdminLandingPath(getAdminSession()));
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Không thể kết nối tới máy chủ";
      setErrors({ password: message });
      showToast("Đăng nhập không thành công", message, "error");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="mx-auto w-full max-w-lg animate-auth-in">
      <div className={CARD}>
        <div className={cardAccent()} />

        <div className="mb-7 text-center">
          <BrandBadge size={96} />
          <div className={EYEBROW}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Chào mừng trở lại</span>
          </div>
          <h1 className={TITLE}>Đăng nhập</h1>
          <p className={SUBTITLE}>
            Truy Cập Công quản lý Nội Bộ Asia Food &amp; Beverage
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-identifier" className={LABEL}>
              Tên đăng nhập
            </label>
            <FloatingField
              id="login-identifier"
              value={identifier}
              onChange={(value) => {
                setIdentifier(value);
                if (errors.identifier)
                  setErrors({ ...errors, identifier: undefined });
              }}
              label="Tên đăng nhập"
              placeholder="Tên đăng nhâp"
              icon={<UserRound className="h-4 w-4" />}
              invalid={Boolean(errors.identifier)}
              autoComplete="username"
            />
            {errors.identifier && (
              <p className={ERROR_TEXT}>{errors.identifier}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-zinc-300"
              >
                Mật khẩu
              </label>
              <button
                type="button"
                onClick={() => router.push("/admin/forgot-password")}
                className={`text-xs font-medium ${LINK}`}
              >
                Quên mật khẩu?
              </button>
            </div>
            <FloatingField
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(value) => {
                setPassword(value);
                if (errors.password)
                  setErrors({ ...errors, password: undefined });
              }}
              label="Mật khẩu"
              placeholder="Nhập mật khẩu..."
              icon={<Lock className="h-4 w-4" />}
              invalid={Boolean(errors.password)}
              autoComplete="current-password"
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Hiện/ẩn mật khẩu"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
            {errors.password && <p className={ERROR_TEXT}>{errors.password}</p>}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  rememberMe
                    ? "bg-[#f5c800] border-[#f5c800] text-black"
                    : "border-white/25 bg-white/5"
                }`}
              >
                {rememberMe && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <span className="text-xs font-medium text-zinc-300">
                Ghi nhớ đăng nhập
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`${PRIMARY_BTN} mt-2`}
          >
            {isLoading ? (
              <ButtonSpinner />
            ) : (
              <>
                <span>Đăng nhập ngay</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthFrame>
      <LoginScreen />
    </AuthFrame>
  );
}
