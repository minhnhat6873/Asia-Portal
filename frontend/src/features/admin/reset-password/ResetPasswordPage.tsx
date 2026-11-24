"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRecovery } from "@/features/auth/RecoveryContext";
import { resetPasswordWithOtp } from "@/features/admin/login/password-reset.service";
import {
  getPasswordValidationError,
  PASSWORD_MAX_LENGTH,
  PASSWORD_REQUIREMENTS,
} from "@/lib/password-validation";
import { ApiError } from "@/services/api";
import AuthFrame from "@/features/admin/auth/AuthFrame";
import { showToast } from "@/features/admin/auth/notify";
import {
  CARD,
  cardAccent,
  TITLE,
  SUBTITLE,
  INPUT,
  PRIMARY_BTN,
  ButtonSpinner,
} from "@/features/admin/auth/AuthElements";
export default function ResetPasswordPage() {
  const recovery = useRecovery();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    if (!completed && (!recovery.email || !recovery.code))
      router.replace("/admin/forgot-password");
  }, [recovery.email, recovery.code, completed, router]);
  if (!recovery.email || !recovery.code) return null;
  return (
    <AuthFrame>
      <div className="mx-auto w-full max-w-md animate-auth-in">
        <div className={CARD}>
          <div className={cardAccent()} />
          <header className="mb-6 text-center">
            <h1 className={TITLE}>Đặt lại mật khẩu</h1>
            <p className={SUBTITLE}>Tạo mật khẩu mới cho {recovery.email}.</p>
          </header>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (loading) return;
              const invalid = getPasswordValidationError(password);
              if (invalid) {
                setError(invalid);
                return;
              }
              if (password !== confirm) {
                setError("Xác nhận mật khẩu không khớp.");
                return;
              }
              setError("");
              setLoading(true);
              try {
                await resetPasswordWithOtp(
                  recovery.email,
                  recovery.code,
                  password,
                  confirm,
                );
                setPassword("");
                setConfirm("");
                setCompleted(true);
                recovery.clear();
                showToast(
                  "Đặt lại mật khẩu thành công!",
                  "Bạn có thể đăng nhập ngay với mật khẩu mới.",
                  "success",
                );
                router.replace("/admin/login");
              } catch (error) {
                setError(
                  error instanceof ApiError
                    ? error.message
                    : "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="block text-sm text-zinc-300">
              Mật khẩu mới
              <input
                className={INPUT + " mt-2 pl-3.5"}
                type="password"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Xác nhận mật khẩu mới
              <input
                className={INPUT + " mt-2 pl-3.5"}
                type="password"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>
            <p className="text-xs text-zinc-400">{PASSWORD_REQUIREMENTS}</p>
            {error && (
              <p role="alert" className="text-sm text-rose-400">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className={PRIMARY_BTN}>
              {loading ? <ButtonSpinner /> : "Đặt lại mật khẩu"}
            </button>
          </form>
          <Link
            href="/admin/forgot-password"
            className="mt-6 block text-center text-sm text-zinc-400 hover:text-white"
          >
            Yêu cầu mã mới
          </Link>
        </div>
      </div>
    </AuthFrame>
  );
}
