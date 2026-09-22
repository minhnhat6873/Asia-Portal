/**
 * Asia F&B admin authentication flow — /admin/login
 *
 * One client component owns the whole thing: the four screens (Đăng nhập ·
 * Đăng ký · Quên mật khẩu · Xác thực OTP), the ambient background, the toast
 * queue and the shared brand styles. Modelled on the "TestAdmin" prototype and
 * re-skinned with the Asia Internal Portal palette (`globals.css` tokens):
 *   --wana-green  #1a7a1a   primary
 *   --wana-green-dark #0d5c0d  gradients
 *   --wana-yellow #f5c800   accent
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Info, KeyRound, Lock, LockKeyhole, Mail, Phone, RotateCcw, ShieldAlert, ShieldCheck, Sparkles, User, X } from "lucide-react";

/* ========================================================================== *
 * Types
 * ========================================================================== */

type AuthView = "login" | "register" | "forgot-password" | "otp";
type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

type ShowToast = (title: string, message?: string, type?: ToastType) => void;

/** Demo verification code accepted by the simulated backend. */
const DEMO_CODE = "123456";

/* ========================================================================== *
 * Shared styles
 * ========================================================================== */

const CARD =
  "relative rounded-2xl bg-white/90 backdrop-blur-xl border-emerald-900/10 shadow-xl shadow-emerald-900/5 p-6 sm:p-8 transition-all duration-300";

/** Gradient highlight pinned to the card's top edge; `via` sets the hue. */
function cardAccent(via = "via-[#1a7a1a]/80") {
  return `absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent ${via} to-transparent`;
}

const INPUT =
  "w-full pl-10 py-2.5 text-sm rounded-xl bg-emerald-50/40 border-emerald-900/15 text-zinc-900 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-[#1a7a1a] focus:ring-4 focus:ring-[#1a7a1a]/15";

const INPUT_ERROR = "border-rose-500 focus:border-rose-500 focus:ring-rose-500/15";
const LABEL = "block text-xs font-semibold text-zinc-700 mb-1.5";
const ERROR_TEXT = "text-xs text-rose-500 mt-1 pl-1 font-medium";
const INPUT_ICON = "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400";

const PRIMARY_BTN =
  "w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0d5c0d] via-[#1a7a1a] to-[#2d9e2d] text-white font-semibold text-sm shadow-md shadow-[#1a7a1a]/25 flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed";

const ACCENT_BTN =
  "w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4aa00] via-[#f5c800] to-[#1a7a1a] text-[#1a1a1a] font-semibold text-sm shadow-md shadow-[#f5c800]/30 flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed";

const EYEBROW =
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border-emerald-200/70 text-[#0d5c0d] text-xs font-semibold mb-3";

const TITLE = "text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900";
const SUBTITLE = "text-sm text-zinc-500 mt-1.5";
const FOOTER_TEXT = "mt-6 text-center text-xs text-zinc-500";
const LINK = "font-semibold text-[#1a7a1a] hover:text-[#0d5c0d] transition-colors";

/** Rounded icon badge heading the Forgot/OTP screens. */
function iconBadge(tone: "amber" | "green") {
  return `w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${
    tone === "amber"
      ? "bg-amber-500/10 border-amber-500/20 text-[#b8860b]"
      : "bg-emerald-500/10 border-emerald-500/20 text-[#1a7a1a]"
  }`;
}

/** Spinner shown inside a button while a simulated request is in flight. */
function ButtonSpinner() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />;
}

/* ========================================================================== *
 * Ambient background + toasts
 * ========================================================================== */

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40" />
      <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#1a7a1a_1px,transparent_1px)] [background-size:24px_24px]" />
      <div
        style={{ animation: "asia-orb-drift 18s ease-in-out infinite" }}
        className="absolute -left-32 -top-36 h-96 w-96 rounded-full bg-gradient-to-tr from-[#1a7a1a]/15 via-[#f5c800]/10 to-transparent blur-3xl sm:h-[500px] sm:w-[500px]"
      />
      <div
        style={{ animation: "asia-orb-drift 22s ease-in-out 2s infinite reverse" }}
        className="absolute -bottom-40 -right-36 h-96 w-96 rounded-full bg-gradient-to-br from-[#2d9e2d]/12 via-[#1a7a1a]/10 to-transparent blur-3xl sm:h-[540px] sm:w-[540px]"
      />
    </div>
  );
}

const TOAST_TONES: Record<ToastType, string> = {
  success: "bg-emerald-50/95 border-emerald-300 text-emerald-900",
  error: "bg-rose-50/95 border-rose-300 text-rose-900",
  info: "bg-[#f5c800]/15 border-[#f5c800]/60 text-[#4a3c00]",
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md animate-toast-in ${TOAST_TONES[t.type]}`}
        >
          <div className="mt-0.5 shrink-0">
            {t.type === "success" && <CheckCircle2 className="h-5 w-5 text-[#1a7a1a]" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5 text-rose-600" />}
            {t.type === "info" && <Info className="h-5 w-5 text-[#b8860b]" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{t.title}</p>
            {t.message && (
              <p className="mt-1 break-words text-xs leading-relaxed opacity-90">{t.message}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Đóng thông báo"
            className="p-1 text-zinc-400 transition-colors hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================== *
 * Screen 1 — Đăng nhập
 * ========================================================================== */

function LoginScreen({
  onNavigate,
  showToast,
}: {
  onNavigate: (v: AuthView) => void;
  showToast: ShowToast;
}) {
  const [identifier, setIdentifier] = useState("nhanvien@asiafnb.vn");
  const [password, setPassword] = useState("Asia@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) errs.identifier = "Vui lòng nhập Email hoặc Số điện thoại";
    if (!password) errs.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6) errs.password = "Mật khẩu phải từ 6 ký tự trở lên";

    setErrors(errs);
    if (Object.keys(errs).length) {
      showToast("Thông tin chưa hợp lệ", "Vui lòng kiểm tra lại các trường bắt buộc.", "error");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast("Đăng nhập thành công!", "Chào mừng bạn quay lại cổng thông tin nội bộ Asia F&B.", "success");
    }, 1200);
  };

  const fillDemo = () => {
    setIdentifier("nhanvien@asiafnb.vn");
    setPassword("Asia@2026");
    setErrors({});
    showToast("Đã điền mẫu", "Đã cập nhật tài khoản mẫu để bạn trải nghiệm nhanh.", "info");
  };

  return (
    <div className="mx-auto w-full max-w-md animate-auth-in">
      <div className={CARD}>
        <div className={cardAccent()} />

        <div className="mb-6 text-center">
          <div className={EYEBROW}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Chào mừng trở lại</span>
          </div>
          <h1 className={TITLE}>Đăng nhập</h1>
          <p className={SUBTITLE}>Truy cập cổng thông tin nội bộ Asia Food &amp; Beverage</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>Email hoặc Số điện thoại</label>
            <div className="relative">
              <div className={INPUT_ICON}>
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier) setErrors({ ...errors, identifier: undefined });
                }}
                placeholder="name@asiafnb.vn hoặc 0912..."
                className={`${INPUT} pr-4 ${errors.identifier ? INPUT_ERROR : ""}`}
              />
            </div>
            {errors.identifier && <p className={ERROR_TEXT}>{errors.identifier}</p>}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700">Mật khẩu</label>
              <button
                type="button"
                onClick={() => onNavigate("forgot-password")}
                className={`text-xs font-medium ${LINK}`}
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="relative">
              <div className={INPUT_ICON}>
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                placeholder="Nhập mật khẩu..."
                className={`${INPUT} pr-11 ${errors.password ? INPUT_ERROR : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Hiện/ẩn mật khẩu"
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 transition-colors hover:text-zinc-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
                  rememberMe ? "bg-[#1a7a1a] border-[#1a7a1a] text-white" : "border-zinc-300 bg-white"
                }`}
              >
                {rememberMe && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <span className="text-xs font-medium text-zinc-600">Ghi nhớ đăng nhập</span>
            </label>

            <button
              type="button"
              onClick={fillDemo}
              className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-[#1a7a1a]"
            >
              Điền dữ liệu mẫu
            </button>
          </div>

          <button type="submit" disabled={isLoading} className={`${PRIMARY_BTN} mt-2`}>
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

        <div className={FOOTER_TEXT}>
          Chưa có tài khoản?{" "}
          <button
            type="button"
            onClick={() => onNavigate("register")}
            className={`${LINK} ml-1 underline`}
          >
            Đăng ký ngay
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * Screen 2 — Đăng ký
 * ========================================================================== */

function RegisterScreen({
  onNavigate,
  onRegisterSuccess,
  showToast,
}: {
  onNavigate: (v: AuthView) => void;
  onRegisterSuccess: (email: string, phone: string) => void;
  showToast: ShowToast;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  /** Live password-strength score (8+ chars, uppercase, digit, symbol). */
  const strength = useMemo(() => {
    const { password } = form;
    if (!password) return { score: 0, label: "Chưa nhập", color: "bg-zinc-200" };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: "Yếu", color: "bg-rose-500" };
      case 2:
        return { score: 50, label: "Trung bình", color: "bg-amber-500" };
      case 3:
        return { score: 75, label: "Mạnh", color: "bg-[#2d9e2d]" };
      default:
        return { score: 100, label: "Rất mạnh", color: "bg-[#1a7a1a]" };
    }
  }, [form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { fullName, email, phone, password, confirmPassword } = form;
    const errs: Record<string, string> = {};

    if (!fullName.trim()) errs.fullName = "Vui lòng nhập họ và tên";
    if (!email.trim()) errs.email = "Vui lòng nhập địa chỉ email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email không đúng định dạng";
    if (!phone.trim()) errs.phone = "Vui lòng nhập số điện thoại";
    else if (!/^[0-9+ ]{9,15}$/.test(phone)) errs.phone = "Số điện thoại không hợp lệ (từ 9 - 11 số)";
    if (!password) errs.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 8) errs.password = "Mật khẩu phải chứa ít nhất 8 ký tự";
    if (password !== confirmPassword) errs.confirmPassword = "Mật khẩu xác nhận không trùng khớp";
    if (!agreeTerms) errs.agreeTerms = "Bạn cần đồng ý với Điều khoản dịch vụ & Chính sách bảo mật";

    setErrors(errs);
    if (Object.keys(errs).length) {
      showToast("Thông tin chưa hoàn tất", "Vui lòng kiểm tra các trường bị báo lỗi.", "error");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast("Tạo tài khoản thành công!", "Chúng tôi đã gửi mã OTP xác thực kích hoạt tài khoản.", "success");
      onRegisterSuccess(email, phone);
    }, 1200);
  };

  const fillSample = () => {
    setForm({
      fullName: "Trần Bảo Long",
      email: "long.tran@asiafnb.vn",
      phone: "0988123456",
      password: "AsiaPro#2026",
      confirmPassword: "AsiaPro#2026",
    });
    setAgreeTerms(true);
    setErrors({});
    showToast("Đã điền thông tin", "Dữ liệu mẫu hợp lệ đã được điền sẵn.", "info");
  };

  /** One password-rule chip. */
  const rule = (passed: boolean, label: string) => (
    <span
      className={`inline-flex items-center gap-1 ${
        passed ? "font-medium text-[#1a7a1a]" : "text-zinc-400"
      }`}
    >
      {passed ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" />
      )}
      {label}
    </span>
  );

  return (
    <div className="mx-auto w-full max-w-lg animate-auth-in">
      <div className={CARD}>
        <div className={cardAccent()} />

        <div className="mb-6 text-center">
          <div className={EYEBROW}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Tạo tài khoản mới</span>
          </div>
          <h1 className={TITLE}>Đăng ký thành viên</h1>
          <p className={SUBTITLE}>Kết nối đội ngũ Asia F&amp;B và cùng phát triển mỗi ngày</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>Họ và tên</label>
            <div className="relative">
              <div className={INPUT_ICON}>
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => set("fullName")(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={`${INPUT} pr-4 ${errors.fullName ? INPUT_ERROR : ""}`}
              />
            </div>
            {errors.fullName && <p className={ERROR_TEXT}>{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Email</label>
              <div className="relative">
                <div className={INPUT_ICON}>
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                  placeholder="name@asiafnb.vn"
                  className={`${INPUT} pr-3 ${errors.email ? INPUT_ERROR : ""}`}
                />
              </div>
              {errors.email && <p className={ERROR_TEXT}>{errors.email}</p>}
            </div>

            <div>
              <label className={LABEL}>Số điện thoại</label>
              <div className="relative">
                <div className={INPUT_ICON}>
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                  placeholder="0912 345 678"
                  className={`${INPUT} pr-3 ${errors.phone ? INPUT_ERROR : ""}`}
                />
              </div>
              {errors.phone && <p className={ERROR_TEXT}>{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className={LABEL}>Mật khẩu</label>
            <div className="relative">
              <div className={INPUT_ICON}>
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
                placeholder="Tối thiểu 8 ký tự, chữ hoa, số & ký tự đặc biệt"
                className={`${INPUT} pr-11 ${errors.password ? INPUT_ERROR : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Hiện/ẩn mật khẩu"
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 transition-colors hover:text-zinc-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {form.password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Độ mạnh mật khẩu:</span>
                  <span className="font-semibold text-zinc-700">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  {rule(form.password.length >= 8, "8+ ký tự")}
                  {rule(/[A-Z]/.test(form.password), "Chữ hoa")}
                  {rule(/[0-9]/.test(form.password), "Số")}
                  {rule(/[^A-Za-z0-9]/.test(form.password), "Ký tự đặc biệt")}
                </div>
              </div>
            )}
            {errors.password && <p className={ERROR_TEXT}>{errors.password}</p>}
          </div>

          <div>
            <label className={LABEL}>Xác nhận lại mật khẩu</label>
            <div className="relative">
              <div className={INPUT_ICON}>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword")(e.target.value)}
                placeholder="Nhập lại mật khẩu vừa tạo"
                className={`${INPUT} pr-4 ${errors.confirmPassword ? INPUT_ERROR : ""}`}
              />
            </div>
            {errors.confirmPassword && <p className={ERROR_TEXT}>{errors.confirmPassword}</p>}
          </div>

          <div>
            <label className="flex cursor-pointer select-none items-start gap-2.5">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: "" }));
                }}
                className="sr-only"
              />
              <span
                className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  agreeTerms ? "bg-[#1a7a1a] border-[#1a7a1a] text-white" : "border-zinc-300 bg-white"
                }`}
              >
                {agreeTerms && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <span className="text-xs leading-relaxed text-zinc-600">
                Tôi đồng ý với{" "}
                <button
                  type="button"
                  onClick={() => showToast("Điều khoản", "Điều khoản dịch vụ của cổng thông tin nội bộ Asia F&B", "info")}
                  className="text-[#1a7a1a] underline"
                >
                  Điều khoản dịch vụ
                </button>{" "}
                và{" "}
                <button
                  type="button"
                  onClick={() => showToast("Chính sách", "Chính sách quyền riêng tư và mã hóa dữ liệu nội bộ", "info")}
                  className="text-[#1a7a1a] underline"
                >
                  Chính sách bảo mật
                </button>
              </span>
            </label>
            {errors.agreeTerms && <p className={ERROR_TEXT}>{errors.agreeTerms}</p>}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={fillSample}
              className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-[#1a7a1a]"
            >
              Điền nhanh mẫu đăng ký
            </button>
          </div>

          <button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
            {isLoading ? (
              <ButtonSpinner />
            ) : (
              <>
                <span>Đăng ký &amp; Nhận mã OTP</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className={FOOTER_TEXT}>
          Đã có tài khoản?{" "}
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className={`${LINK} ml-1 underline`}
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * Screen 3 — Quên mật khẩu
 * ========================================================================== */

function ForgotPasswordScreen({
  onNavigate,
  onRequestOtp,
  showToast,
}: {
  onNavigate: (v: AuthView) => void;
  onRequestOtp: (email: string) => void;
  showToast: ShowToast;
}) {
  const [email, setEmail] = useState("nhanvien@asiafnb.vn");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const msg = email.trim()
        ? "Địa chỉ email không đúng định dạng"
        : "Vui lòng nhập địa chỉ email";
      setError(msg);
      showToast("Thông tin chưa đúng", msg, "error");
      return;
    }

    setError("");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast(
        "Đã gửi mã xác thực!",
        "Mã OTP gồm 6 chữ số đã được gửi tới email của bạn.",
        "success"
      );
      onRequestOtp(email);
    }, 1100);
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
          <p className={`${SUBTITLE} leading-relaxed`}>
            Đừng lo lắng! Hãy nhập địa chỉ email đã đăng ký để nhận mã OTP lấy lại quyền truy cập
            tài khoản.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>Địa chỉ Email đã đăng ký</label>
            <div className="relative">
              <div className={INPUT_ICON}>
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="name@asiafnb.vn"
                className={`${INPUT} pr-4 ${error ? INPUT_ERROR : ""}`}
              />
            </div>
          </div>

          {error && <p className="pl-1 text-xs font-medium text-rose-500">{error}</p>}

          <div className="flex items-start gap-2.5 rounded-xl border-emerald-900/10 bg-emerald-50/60 p-3 text-xs leading-relaxed text-zinc-500">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b8860b]" />
            <span>
              Mã xác thực có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai để bảo vệ
              tài khoản.
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
            onClick={() => onNavigate("login")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại trang Đăng nhập</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * Screen 4 — Xác thực OTP
 * ========================================================================== */

function OtpScreen({
  onNavigate,
  target,
  showToast,
}: {
  onNavigate: (v: AuthView) => void;
  target: string;
  showToast: ShowToast;
}) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(59);
  const [hasError, setHasError] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /** Derived rather than stored, so no state is set inside the effect. */
  const canResend = countdown <= 0;

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

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

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    else if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    else if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;

    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    setHasError(false);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length < 6) {
      setHasError(true);
      showToast("Chưa đủ 6 số", "Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.", "error");
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      if (code !== DEMO_CODE && code !== "000") {
        setHasError(true);
        showToast("Mã OTP không đúng", `Mã xác thực không hợp lệ. Vui lòng thử lại với ${DEMO_CODE}.`, "error");
        return;
      }
      setIsSuccess(true);
      showToast("Xác thực thành công!", "Tài khoản của bạn đã được xác minh thành công.", "success");
    }, 1100);
  };

  return (
    <div className="mx-auto w-full max-w-md animate-auth-in">
      <div className={CARD}>
        <div className={cardAccent()} />

        {isSuccess ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border-[#1a7a1a]/30 bg-emerald-500/15 text-[#1a7a1a]">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">Xác thực thành công!</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Mã OTP hợp lệ. Danh tính của bạn qua Email đã được chứng thực 100%.
            </p>

            <div className="my-6 space-y-3 rounded-xl border-emerald-900/10 bg-emerald-50/50 p-4 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                <LockKeyhole className="h-4 w-4 text-[#1a7a1a]" />
                <span>Đặt mật khẩu mới (Nếu đang khôi phục tài khoản)</span>
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className={`${INPUT} pl-3.5`}
              />
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Xác nhận lại mật khẩu mới..."
                className={`${INPUT} pl-3.5`}
              />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  showToast("Đã cập nhật!", "Bạn có thể đăng nhập ngay với thông tin mới.", "success");
                  onNavigate("login");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0d5c0d] to-[#2d9e2d] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#1a7a1a]/25 transition-all duration-200 hover:brightness-110"
              >
                <span>Hoàn tất &amp; Đăng nhập</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setOtp(Array(6).fill(""));
                }}
                className="w-full py-2 text-xs text-zinc-500 transition-colors hover:text-zinc-800"
              >
                Thử lại quy trình xác thực OTP
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <div className={iconBadge("green")}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className={TITLE}>Xác thực mã OTP</h1>
              <p className={`${SUBTITLE} leading-relaxed`}>Nhập mã số gồm 6 chữ số vừa được gửi đến</p>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0d5c0d]">
                <Mail className="h-3.5 w-3.5 text-[#1a7a1a]" />
                <span>{target}</span>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <div
                  className={`flex items-center justify-between gap-1.5 sm:gap-2.5 ${
                    hasError ? "animate-shake" : ""
                  }`}
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
                      className={`h-13 w-11 rounded-xl border bg-emerald-50/50 text-center text-xl font-bold text-zinc-900 outline-none transition-all duration-200 sm:h-15 sm:w-13 sm:text-2xl ${
                        hasError
                          ? "border-rose-500 text-rose-600 focus:ring-4 focus:ring-rose-500/15"
                          : digit
                          ? "border-[#1a7a1a] bg-emerald-50/70 ring-2 ring-[#1a7a1a]/20"
                          : "border-emerald-900/15 focus:border-[#1a7a1a] focus:ring-4 focus:ring-[#1a7a1a]/15"
                      }`}
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
                        setCountdown(59);
                        setOtp(Array(6).fill(""));
                        setHasError(false);
                        showToast(
                          "Mã mới đã được gửi!",
                          `Đã phát lại mã OTP gồm 6 chữ số tới ${target}. Thử nghiệm: ${DEMO_CODE}`,
                          "success"
                        );
                        inputRefs.current[0]?.focus();
                      }}
                      className="flex items-center gap-1 font-semibold text-[#1a7a1a] underline-offset-2 transition-colors hover:text-[#0d5c0d]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Gửi lại mã mới</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a7a1a]" />
                      Gửi lại sau <strong className="text-zinc-800">{countdown}s</strong>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOtp(DEMO_CODE.split(""));
                    setHasError(false);
                    showToast("Đã nhập mã mẫu", `Đã tự động điền mã ${DEMO_CODE}.`, "info");
                  }}
                  className="text-zinc-500 underline-offset-2 transition-colors hover:text-[#1a7a1a]"
                >
                  Mã thử: {DEMO_CODE}
                </button>
              </div>

              <button
                type="submit"
                disabled={isVerifying || otp.join("").length < 6}
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
                onClick={() => onNavigate("login")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Quay lại Đăng nhập</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== *
 * Flow shell
 * ========================================================================== */

export default function AuthFlow() {
  const [view, setView] = useState<AuthView>("login");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [otpTarget, setOtpTarget] = useState("nhanvien@asiafnb.vn");

  const showToast = useCallback((title: string, message?: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback(
    (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  /** Register / forgot-password both hand the email over to the OTP screen. */
  const goToOtp = (email: string) => {
    setOtpTarget(email);
    setView("otp");
  };

  return (
    <main className="relative flex min-h-screen flex-col justify-between selection:bg-[#1a7a1a] selection:text-white">
      <AmbientBackground />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-5xl">
          {view === "login" && <LoginScreen onNavigate={setView} showToast={showToast} />}

          {view === "register" && (
            <RegisterScreen
              onNavigate={setView}
              onRegisterSuccess={goToOtp}
              showToast={showToast}
            />
          )}

          {view === "forgot-password" && (
            <ForgotPasswordScreen onNavigate={setView} onRequestOtp={goToOtp} showToast={showToast} />
          )}

          {view === "otp" && (
            <OtpScreen onNavigate={setView} target={otpTarget} showToast={showToast} />
          )}
        </div>
      </div>

      <footer className="mx-auto w-full max-w-5xl border-t border-emerald-900/10 px-4 py-6 text-xs text-zinc-500">
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#1a7a1a]" />
          <span>Asia Internal Portal • Hệ thống xác thực nội bộ Asia Food &amp; Beverage</span>
        </div>
      </footer>
    </main>
  );
}
