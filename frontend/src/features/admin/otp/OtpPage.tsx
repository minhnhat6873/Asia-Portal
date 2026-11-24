"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  resendPasswordResetOtp,
  verifyPasswordResetOtp,
} from "@/features/admin/login/password-reset.service";
import { ApiError } from "@/services/api";
import { useRecovery } from "@/features/auth/RecoveryContext";
import AuthFrame from "@/features/admin/auth/AuthFrame";
import { showToast } from "@/features/admin/auth/notify";
import {
  CARD,
  cardAccent,
  PRIMARY_BTN,
  TITLE,
  SUBTITLE,
  FOOTER_TEXT,
  iconBadge,
  ButtonSpinner,
} from "@/features/admin/auth/AuthElements";
function OtpScreen() {
  const router = useRouter();
  const recovery = useRecovery();
  const target = recovery.email;
  useEffect(() => {
    if (!target) router.replace("/admin/forgot-password");
  }, [target, router]);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(59);
  const [otpExpiryCountdown, setOtpExpiryCountdown] = useState(() =>
    Math.max(0, Math.ceil((recovery.expiresAt - Date.now()) / 1000)),
  );
  const [hasError, setHasError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /** Derived rather than stored, so no state is set inside the effect. */
  const canResend = countdown <= 0;
  const isOtpExpired = otpExpiryCountdown <= 0;
  const otpMinutes = Math.floor(otpExpiryCountdown / 60)
    .toString()
    .padStart(2, "0");
  const otpSeconds = (otpExpiryCountdown % 60).toString().padStart(2, "0");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (otpExpiryCountdown <= 0) return;
    const timer = setTimeout(
      () => setOtpExpiryCountdown((seconds) => seconds - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [otpExpiryCountdown]);

  const handleDigit = (index: number, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    const next = [...otp];

    if (!digits) {
      next[index] = "";
      setOtp(next);
      return;
    }

    next[index] = digits.slice(-1);
    setOtp(next);
    setHasError(false);
    if (index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
    else if (e.key === "ArrowLeft" && index > 0)
      inputRefs.current[index - 1]?.focus();
    else if (e.key === "ArrowRight" && index < 5)
      inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    if (!pasted) return;

    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    setHasError(false);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");

    if (isOtpExpired) {
      setHasError(true);
      showToast(
        "Mã OTP đã hết hạn",
        "Vui lòng yêu cầu gửi lại mã OTP mới.",
        "error",
      );
      return;
    }

    if (code.length < 6) {
      setHasError(true);
      showToast(
        "Chưa đủ 6 số",
        "Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.",
        "error",
      );
      return;
    }

    setIsVerifying(true);
    try {
      await verifyPasswordResetOtp(target, code);
      recovery.verify(code);
      router.push("/admin/reset-password");
      showToast(
        "Xác thực thành công!",
        "Mã OTP hợp lệ. Bạn có thể đặt mật khẩu mới.",
        "success",
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Không thể xác thực mã OTP. Vui lòng thử lại.";
      setHasError(true);
      showToast("Xác thực chưa thành công", message, "error");
    } finally {
      setIsVerifying(false);
    }
  };
  const handleResend = async () => {
    try {
      const result = await resendPasswordResetOtp(target);
      setCountdown(59);
      recovery.start(result.email, "reset", result.expiresInSeconds);
      setOtpExpiryCountdown(result.expiresInSeconds);
      setOtp(Array(6).fill(""));
      setHasError(false);
      showToast(
        "Mã OTP mới đã được gửi",
        "Vui lòng kiểm tra hộp thư email của bạn.",
        "success",
      );
      inputRefs.current[0]?.focus();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Không thể gửi lại mã OTP. Vui lòng thử lại.";
      showToast("Không thể gửi lại mã", message, "error");
    }
  };

  if (!target) return null;

  return (
    <div className="mx-auto w-full max-w-md animate-auth-in">
      <div className={CARD}>
        <div className={cardAccent()} />

        <div>
          <div className="mb-6 text-center">
            <div className={iconBadge("green")}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className={TITLE}>Xác thực mã OTP</h1>
            <p className={`${SUBTITLE} leading-relaxed`}>
              Nhập mã số gồm 6 chữ số vừa được gửi đến
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[#f5c800]/25 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-[#f5c800]">
              <Mail className="h-3.5 w-3.5 text-[#f5c800]" />
              <span>{target}</span>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <div
                className={`flex items-center justify-between gap-1.5 sm:gap-2.5 ${hasError ? "animate-shake" : ""}`}
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    aria-label={`Chữ số OTP ${idx + 1}`}
                    onChange={(e) => handleDigit(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className={`h-13 w-11 rounded-xl border bg-white/[0.04] text-center text-xl font-bold text-white outline-none transition-all duration-200 sm:h-15 sm:w-13 sm:text-2xl ${hasError ? "border-rose-500 text-rose-300 focus:ring-4 focus:ring-rose-500/15" : digit ? "border-[#f5c800] bg-[#f5c800]/10 ring-2 ring-[#f5c800]/25" : "border-white/15 focus:border-[#f5c800] focus:ring-4 focus:ring-[#f5c800]/15"}`}
                  />
                ))}
              </div>
              {hasError && (
                <p className="mt-2 text-center text-xs font-medium text-rose-500">
                  Mã xác thực không hợp lệ. Vui lòng thử lại.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="text-zinc-500">
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleResend();
                    }}
                    className="flex items-center gap-1 font-semibold text-[#1a7a1a] underline-offset-2 transition-colors hover:text-[#0d5c0d]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Gửi lại mã mới</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a7a1a]" />
                    Gửi lại sau{" "}
                    <strong className="text-zinc-300">{countdown}s</strong>
                  </span>
                )}
              </div>
              <span
                className={`shrink-0 font-medium ${isOtpExpired ? "text-rose-400" : "text-zinc-400"}`}
              >
                {isOtpExpired
                  ? "Mã OTP đã hết hạn"
                  : `Hết hạn sau ${otpMinutes}:${otpSeconds}`}
              </span>
            </div>

            <button
              type="submit"
              disabled={isVerifying || isOtpExpired || otp.join("").length < 6}
              className={PRIMARY_BTN}
            >
              {isVerifying ? (
                <ButtonSpinner />
              ) : (
                <>
                  <span>Xác nhận mã OTP</span>
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
              <span>Quay lại Đăng nhập</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <AuthFrame>
      <OtpScreen />
    </AuthFrame>
  );
}
