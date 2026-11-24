"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { requestPasswordResetOtp } from "@/features/admin/login/password-reset.service";
import { ApiError } from "@/services/api";
import { useRecovery } from "@/features/auth/RecoveryContext";
import AuthFrame from "@/features/admin/auth/AuthFrame";
import { showToast } from "@/features/admin/auth/notify";
import {
  CARD,
  cardAccent,
  LABEL,
  ACCENT_BTN,
  TITLE,
  FOOTER_TEXT,
  iconBadge,
  ButtonSpinner,
  FloatingField,
} from "@/features/admin/auth/AuthElements";
function ForgotPasswordScreen() {
  const router = useRouter();
  const recovery = useRecovery();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Vui lòng nhập email đã đăng ký.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Email không hợp lệ.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      const result = await requestPasswordResetOtp(normalizedEmail);
      showToast(
        "Mã xác thực đã được gửi",
        "Vui lòng kiểm tra email để tiếp tục khôi phục mật khẩu.",
        "success",
      );
      recovery.start(result.email, "reset", result.expiresInSeconds);
      router.push("/admin/otp");
    } catch (requestError) {
      const message =
        requestError instanceof ApiError
          ? requestError.message
          : "Không thể gửi mã OTP. Vui lòng thử lại.";
      setError(message);
      showToast("Không thể gửi mã", message, "error");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="mx-auto w-full max-w-md animate-auth-in">
      <div className={CARD}>
        <div className={cardAccent("via-[#f5c800]/80")} />

        <div className="mb-6 text-center">
          <div className={iconBadge("amber")}>
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className={TITLE}>Quên mật khẩu?</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className={LABEL}>
              Địa chỉ Email đã đăng ký
            </label>
            <FloatingField
              id="forgot-email"
              type="email"
              value={email}
              onChange={(value) => {
                setEmail(value);
                if (error) setError("");
              }}
              label="Địa chỉ Email đã đăng ký"
              placeholder="name@asiafnb.com"
              icon={<Mail className="h-4 w-4" />}
              invalid={Boolean(error)}
              autoComplete="email"
            />
          </div>

          {error && (
            <p className="pl-1 text-xs font-medium text-rose-500">{error}</p>
          )}

          <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-relaxed text-zinc-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#f5c800]" />
            <span>
              Mã xác thực có hiệu lực trong 3 phút. Vui lòng không chia sẻ mã
              này với bất kỳ ai để bảo vệ tài khoản.
            </span>
          </div>

          <button type="submit" disabled={isLoading} className={ACCENT_BTN}>
            {isLoading ? (
              <ButtonSpinner />
            ) : (
              <>
                <span>Tiếp tục nhận mã OTP</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className={FOOTER_TEXT}>
          <button
            type="button"
            onClick={() => router.push("/admin/login")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại trang Đăng nhập</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthFrame>
      <ForgotPasswordScreen />
    </AuthFrame>
  );
}
