/**
 * Asia F&B admin authentication flow — /admin/login
 *
 * One client component owns the whole thing: the four screens (Đăng nhập ·
 * Đăng ký · Quên mật khẩu · Xác thực OTP), the ambient background, the toast
 * queue and the shared brand styles. Modelled on the "TestAdmin" prototype and
 * re-skinned with the Asia F&B brand:
 *   Black canvas (#060806) with the Asia F&B round badge.
 *   --wana-green  #1a7a1a   primary
 *   --wana-green-dark #0d5c0d  gradients
 *   --wana-yellow #f5c800   accent (matches the gold ring in the logo)
 */

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, KeyRound, Lock, LockKeyhole, Mail, Phone, RotateCcw, ShieldAlert, ShieldCheck, Sparkles, User } from "lucide-react";
import { setAdminSession } from "@/lib/adminSession";
import { getAdminRoleLabel, loginAdmin } from "@/features/admin/login/auth.service";
import { getPasswordValidationError, normalizeVietnamPhone, validateRegisterForm } from "@/features/admin/register/register.validation";
import { resendRegistrationOtp, startRegistration, verifyRegistrationOtp } from "@/features/admin/register/register.service";
import { requestPasswordResetOtp, resendPasswordResetOtp, resetPasswordWithOtp, verifyPasswordResetOtp } from "@/features/admin/login/password-reset.service";
import { ApiError } from "@/services/api";
import { toast } from "sonner";

/* ========================================================================== *
 * Types
 * ========================================================================== */

type AuthView = "login" | "register" | "forgot-password" | "otp";
type OtpPurpose = "registration" | "password-reset";
type ToastType = "success" | "error" | "info";

type ShowToast = (title: string, message?: string, type?: ToastType) => void;


/* ========================================================================== *
 * Shared styles — black canvas, gold accent, Asia F&B badge
 * ========================================================================== */

const CARD =
  "relative rounded-2xl bg-[#0d100e]/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 p-7 sm:p-10 transition-all duration-300";

/** Gradient highlight pinned to the card's top edge; `via` sets the hue. */
function cardAccent(via = "via-[#f5c800]/70") {
  return `absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent ${via} to-transparent`;
}

const INPUT =
  "w-full pl-10 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/12 text-white placeholder:text-zinc-500 outline-none transition-all duration-200 focus:border-[#f5c800] focus:ring-4 focus:ring-[#f5c800]/15";

const INPUT_ERROR = "border-rose-500 focus:border-rose-500 focus:ring-rose-500/15";
const LABEL = "block text-xs font-semibold text-zinc-300 mb-1.5";
const ERROR_TEXT = "text-xs text-rose-400 mt-1 pl-1 font-medium";
const INPUT_ICON = "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500";

/** Gold primary action — the logo's ring colour, on the black canvas. */
const PRIMARY_BTN =
  "w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4aa00] via-[#f5c800] to-[#e0b400] text-[#1a1a1a] font-bold text-sm shadow-lg shadow-[#f5c800]/20 flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";

const ACCENT_BTN =
  "w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4aa00] via-[#f5c800] to-[#e0b400] text-[#1a1a1a] font-bold text-sm shadow-lg shadow-[#f5c800]/20 flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";

const EYEBROW =
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-[#f5c800]/25 text-[#f5c800] text-xs font-semibold mb-3";

const TITLE = "text-2xl sm:text-3xl font-bold tracking-tight text-white";
const SUBTITLE = "text-sm text-zinc-400 mt-1.5";
const FOOTER_TEXT = "mt-6 text-center text-xs text-zinc-400";
const LINK = "font-semibold text-[#f5c800] hover:text-[#ffd633] transition-colors";

/** Rounded icon badge heading the Forgot/OTP screens. */
function iconBadge(tone: "amber" | "green") {
  return `w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${
    tone === "amber"
      ? "bg-[#f5c800]/10 border-[#f5c800]/25 text-[#f5c800]"
      : "bg-white/[0.06] border-white/15 text-[#f5c800]"
  }`;
}

/** Spinner shown inside a button while a simulated request is in flight. */
function ButtonSpinner() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />;
}

/* -------------------------------------------------------------------------- *
 * Floating field — the faded placeholder overlay
 * -------------------------------------------------------------------------- */

/**
 * An input whose placeholder is a faded overlay label rather than a real
 * `placeholder` attribute. The label sits over the field at reduced opacity and
 * fades out the moment the field is focused or holds text, so the field is clean
 * while typing and the hint returns when it is emptied and blurred.
 *
 * `icon` renders inside the left gutter; `trailing` renders inside the right
 * gutter (e.g. the show/hide password button).
 */
function FloatingField({
  id,
  type = "text",
  value,
  onChange,
  label,
  placeholder,
  icon,
  trailing,
  invalid,
  autoComplete,
  inputMode,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  /** The field name, shown as the small caption above the input. */
  label: string;
  /** The faded hint shown inside the field until the user engages it. */
  placeholder: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  invalid?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const [focused, setFocused] = useState(false);
  // The hint hides as soon as the field is active OR already filled.
  const hintHidden = focused || value.length > 0;

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 transition-colors ${invalid ? "text-rose-400" : focused ? "text-[#f5c800]" : "text-zinc-500"}`}
      >
        {icon}
      </span>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={label}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={`${INPUT} ${trailing ? "pr-11" : "pr-4"} ${invalid ? INPUT_ERROR : ""}`}
      />

      {/* Faded hint overlay — fades out on focus / once there is text. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-10 right-4 flex items-center truncate text-sm transition-opacity duration-200 ${
          hintHidden ? "opacity-0" : "opacity-45"
        } ${invalid ? "text-rose-300" : "text-zinc-400"}`}
      >
        {placeholder}
      </span>

      {trailing}
    </div>
  );
}

/**
 * The Asia F&B round badge, shown at the head of the login card. The PNG has a
 * white background, so it sits on a white disc to blend into the black canvas.
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

/* ========================================================================== *
 * Ambient background + toasts
 * ========================================================================== */

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#060806]">
      {/* Black base with a soft green glow from the top and a gold sheen below. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1410] via-[#060806] to-[#0b0a04]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#f5c800_1px,transparent_1px)] [background-size:26px_26px]" />
      <div
        style={{ animation: "asia-orb-drift 18s ease-in-out infinite" }}
        className="absolute -left-32 -top-36 h-96 w-96 rounded-full bg-gradient-to-tr from-[#1a7a1a]/25 via-[#f5c800]/10 to-transparent blur-3xl sm:h-[500px] sm:w-[500px]"
      />
      <div
        style={{ animation: "asia-orb-drift 22s ease-in-out 2s infinite reverse" }}
        className="absolute -bottom-40 -right-36 h-96 w-96 rounded-full bg-gradient-to-br from-[#f5c800]/12 via-[#1a7a1a]/15 to-transparent blur-3xl sm:h-[540px] sm:w-[540px]"
      />
      {/* Gold hairline along the very top edge. */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5c800]/50 to-transparent" />
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
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) errs.identifier = "Vui lòng nhập email";
    if (!password) errs.password = "Vui lòng nhập mật khẩu";

    setErrors(errs);
    if (Object.keys(errs).length) {
      showToast("Thông tin chưa hợp lệ", "Vui lòng kiểm tra lại các trường bắt buộc.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const admin = await loginAdmin({
        email: identifier.trim(),
        password,
        rememberMe,
      });
      setAdminSession({
        id: admin.id,
        email: admin.email,
        fullName: admin.name,
        role: getAdminRoleLabel(admin.role),
      });
      showToast("Đăng nhập thành công!", "Chào mừng bạn quay lại cổng thông tin nội bộ Asia F&B.", "success");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Không thể kết nối tới máy chủ";
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
          <p className={SUBTITLE}>Truy cập cổng thông tin nội bộ Asia Food &amp; Beverage</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-identifier" className={LABEL}>Email</label>
            <FloatingField
              id="login-identifier"
              value={identifier}
              onChange={(value) => {
                setIdentifier(value);
                if (errors.identifier) setErrors({ ...errors, identifier: undefined });
              }}
              label="Email"
              placeholder="name@asiafnb.com"
              icon={<Mail className="h-4 w-4" />}
              invalid={Boolean(errors.identifier)}
              autoComplete="username"
            />
            {errors.identifier && <p className={ERROR_TEXT}>{errors.identifier}</p>}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-semibold text-zinc-300">Mật khẩu</label>
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
                if (errors.password) setErrors({ ...errors, password: undefined });
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  rememberMe ? "bg-[#f5c800] border-[#f5c800] text-black" : "border-white/25 bg-white/5"
                }`}
              >
                {rememberMe && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <span className="text-xs font-medium text-zinc-300">Ghi nhớ đăng nhập</span>
            </label>


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

        <div className="mt-6 text-center text-base text-zinc-400">
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
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);

    if (key === "password") {
      const passwordError = getPasswordValidationError(value);
      setErrors((current) => ({
        ...current,
        password: passwordError ?? "",
        ...(nextForm.confirmPassword
          ? {
              confirmPassword:
                nextForm.confirmPassword === value ? "" : "Xác nhận mật khẩu không khớp.",
            }
          : {}),
      }));
      return;
    }

    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { fullName, email, phone, password, confirmPassword } = form;
    // Email format validation is intentionally deferred; backend still requires a non-empty email.
    const errs = validateRegisterForm({
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      agreeTerms,
    });
    setErrors(errs);
    if (Object.keys(errs).length) {
      showToast("Thông tin chưa hoàn tất", "Vui lòng kiểm tra các trường bị báo lỗi.", "error");
      return;
    }

    const normalizedPhone = normalizeVietnamPhone(phone);
    setIsLoading(true);

    try {
      await startRegistration({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: normalizedPhone,
        password,
        confirmPassword,
        agreeTerms,
      });

      showToast(
        "Đăng ký thành công!",
        "Mã OTP đã được gửi đến email của bạn. Hãy nhập mã để hoàn tất đăng ký.",
        "success",
      );
      onRegisterSuccess(email.trim(), normalizedPhone);
    } catch (error) {
      const message = error instanceof ApiError
        ? error.errors[0] ?? error.message
        : "Không thể kết nối tới máy chủ. Vui lòng thử lại sau.";
      const fieldErrors: Record<string, string> = {};
      const normalizedMessage = message.toLocaleLowerCase("vi");

      if (normalizedMessage.includes("email")) fieldErrors.email = message;
      else if (normalizedMessage.includes("số điện thoại")) fieldErrors.phone = message;
      else if (normalizedMessage.includes("mật khẩu")) fieldErrors.password = message;

      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      showToast("Đăng ký chưa thành công", message, "error");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="mx-auto w-full max-w-lg animate-auth-in">
      <div className={CARD}>
        <div className={cardAccent()} />

        <div className="mb-6 text-center">
          <BrandBadge size={72} />
          <div className={EYEBROW}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Tạo tài khoản mới</span>
          </div>
          <h1 className={TITLE}>Đăng ký thành viên</h1>
          <p className={SUBTITLE}>Kết nối đội ngũ Asia F&amp;B và cùng phát triển mỗi ngày</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-fullname" className={LABEL}>Họ và tên</label>
            <FloatingField
              id="reg-fullname"
              value={form.fullName}
              onChange={set("fullName")}
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              icon={<User className="h-4 w-4" />}
              invalid={Boolean(errors.fullName)}
              autoComplete="name"
            />
            {errors.fullName && <p className={ERROR_TEXT}>{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-email" className={LABEL}>Email</label>
              <FloatingField
                id="reg-email"
                type="email"
                value={form.email}
                onChange={set("email")}
                label="Email"
                placeholder="name@asiafnb.com"
                icon={<Mail className="h-4 w-4" />}
                invalid={Boolean(errors.email)}
                autoComplete="email"
              />
              {errors.email && <p className={ERROR_TEXT}>{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="reg-phone" className={LABEL}>Số điện thoại</label>
              <FloatingField
                id="reg-phone"
                type="tel"
                value={form.phone}
                onChange={(value) => set("phone")(value.replace(/\D/g, "").slice(0, 10))}
                label="Số điện thoại"
                placeholder="0912345678"
                icon={<Phone className="h-4 w-4" />}
                invalid={Boolean(errors.phone)}
                autoComplete="tel"
                inputMode="numeric"
              />
              {errors.phone && <p className={ERROR_TEXT}>{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="reg-password" className={LABEL}>Mật khẩu</label>
            <FloatingField
              id="reg-password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              label="Mật khẩu"
              placeholder="4–50 ký tự, chữ hoa, chữ thường, số & ký tự đặc biệt"
              icon={<Lock className="h-4 w-4" />}
              invalid={Boolean(errors.password)}
              autoComplete="new-password"
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Hiện/ẩn mật khẩu"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {errors.password && <p className={ERROR_TEXT}>{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="reg-confirm" className={LABEL}>Xác nhận lại mật khẩu</label>
            <FloatingField
              id="reg-confirm"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              label="Xác nhận lại mật khẩu"
              placeholder="Nhập lại mật khẩu vừa tạo"
              icon={<ShieldCheck className="h-4 w-4" />}
              invalid={Boolean(errors.confirmPassword)}
              autoComplete="new-password"
            />
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
                  agreeTerms ? "bg-[#f5c800] border-[#f5c800] text-black" : "border-white/25 bg-white/5"
                }`}
              >
                {agreeTerms && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <span className="text-sm leading-relaxed text-zinc-300">
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

        <div className="mt-6 text-center text-base text-zinc-400">
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
      showToast("Mã xác thực đã được gửi", "Vui lòng kiểm tra email để tiếp tục khôi phục mật khẩu.", "success");
      onRequestOtp(result.email);
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : "Không thể gửi mã OTP. Vui lòng thử lại.";
      setError(message);
      showToast("Không thể gửi mã", message, "error");
    } finally {
      setIsLoading(false);
    }
  };  return (
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
            <label htmlFor="forgot-email" className={LABEL}>Địa chỉ Email đã đăng ký</label>
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

          {error && <p className="pl-1 text-xs font-medium text-rose-500">{error}</p>}

          <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-relaxed text-zinc-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#f5c800]" />
            <span>
              Mã xác thực có hiệu lực trong 3 phút. Vui lòng không chia sẻ mã này với bất kỳ ai để bảo vệ
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

/* ========================================================================== *
 * Screen 4 — Xác thực OTP
 * ========================================================================== */

function OtpScreen({
  onNavigate,
  target,
  purpose,
  showToast,
  onAuthenticated,
}: {
  onNavigate: (v: AuthView) => void;
  target: string;
  purpose: OtpPurpose;
  showToast: ShowToast;
  onAuthenticated: (email: string) => void;
}) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(59);
  const [otpExpiryCountdown, setOtpExpiryCountdown] = useState(180);
  const [hasError, setHasError] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [verifiedOtpCode, setVerifiedOtpCode] = useState("");
  const [passwordResetError, setPasswordResetError] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /** Derived rather than stored, so no state is set inside the effect. */
  const canResend = countdown <= 0;
  const isOtpExpired = otpExpiryCountdown <= 0;
  const otpMinutes = Math.floor(otpExpiryCountdown / 60).toString().padStart(2, "0");
  const otpSeconds = (otpExpiryCountdown % 60).toString().padStart(2, "0");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (otpExpiryCountdown <= 0) return;
    const timer = setTimeout(() => setOtpExpiryCountdown((seconds) => seconds - 1), 1000);
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");

    if (isOtpExpired) {
      setHasError(true);
      showToast("Mã OTP đã hết hạn", "Vui lòng yêu cầu gửi lại mã OTP mới.", "error");
      return;
    }

    if (code.length < 6) {
      setHasError(true);
      showToast("Chưa đủ 6 số", "Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.", "error");
      return;
    }

    setIsVerifying(true);
    try {
      if (purpose === "registration") {
        await verifyRegistrationOtp(target, code);
        setIsSuccess(true);
        showToast("Xác thực thành công!", "Email đã được xác thực và tài khoản đang chờ admin phê duyệt.", "success");
        return;
      }

      await verifyPasswordResetOtp(target, code);
      setVerifiedOtpCode(code);
      setIsSuccess(true);
      showToast("Xác thực thành công!", "Mã OTP hợp lệ. Bạn có thể đặt mật khẩu mới.", "success");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Không thể xác thực mã OTP. Vui lòng thử lại.";
      setHasError(true);
      showToast("Xác thực chưa thành công", message, "error");
    } finally {
      setIsVerifying(false);
    }
  };
  const handleResend = async () => {
    try {
      const result = purpose === "registration"
        ? await resendRegistrationOtp(target)
        : await resendPasswordResetOtp(target);
      setCountdown(59);
      setOtpExpiryCountdown(result.expiresInSeconds);
      setOtp(Array(6).fill(""));
      setHasError(false);
      setIsSuccess(false);
      setVerifiedOtpCode("");
      showToast("Mã OTP mới đã được gửi", "Vui lòng kiểm tra hộp thư email của bạn.", "success");
      inputRefs.current[0]?.focus();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Không thể gửi lại mã OTP. Vui lòng thử lại.";
      showToast("Không thể gửi lại mã", message, "error");
    }
  };

  const handleComplete = async () => {
    if (purpose === "registration") {
      onAuthenticated(target);
      return;
    }

    const validationError = getPasswordValidationError(newPassword);
    if (validationError) {
      setPasswordResetError(validationError);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordResetError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setPasswordResetError("");
    setIsResettingPassword(true);
    try {
      await resetPasswordWithOtp(target, verifiedOtpCode, newPassword, confirmNewPassword);
      showToast("Đặt lại mật khẩu thành công!", "Bạn có thể đăng nhập ngay với mật khẩu mới.", "success");
      onAuthenticated(target);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Không thể đặt lại mật khẩu. Vui lòng thử lại.";
      setPasswordResetError(message);
      showToast("Không thể đặt lại mật khẩu", message, "error");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md animate-auth-in">
      <div className={CARD}>
        <div className={cardAccent()} />

        {isSuccess ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-[#f5c800]/30 bg-[#f5c800]/10 text-[#f5c800]">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-bold text-white">Xác thực thành công!</h2>
            {purpose === "registration" && (<p className="mt-2 text-sm leading-relaxed text-zinc-400">"Email của bạn đã được xác thực. Tài khoản đang chờ admin phê duyệt."</p>)}

            {purpose === "password-reset" && (
              <div className="my-6 space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left">
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
                {passwordResetError && <p className="text-xs font-medium text-rose-400">{passwordResetError}</p>}
              </div>
            )}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => { void handleComplete(); }}
                disabled={isResettingPassword}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4aa00] via-[#f5c800] to-[#e0b400] px-4 py-2.5 text-sm font-bold text-[#1a1a1a] shadow-lg shadow-[#f5c800]/20 transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResettingPassword ? <ButtonSpinner /> : <><span>{purpose === "registration" ? "Về trang Đăng nhập" : "Hoàn tất & Đăng nhập"}</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <div className={iconBadge("green")}><ShieldCheck className="h-6 w-6" /></div>
              <h1 className={TITLE}>Xác thực mã OTP</h1>
              <p className={`${SUBTITLE} leading-relaxed`}>Nhập mã số gồm 6 chữ số vừa được gửi đến</p>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[#f5c800]/25 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-[#f5c800]">
                <Mail className="h-3.5 w-3.5 text-[#f5c800]" />
                <span>{target}</span>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <div className={`flex items-center justify-between gap-1.5 sm:gap-2.5 ${hasError ? "animate-shake" : ""}`}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
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
                {hasError && <p className="mt-2 text-center text-xs font-medium text-rose-500">Mã xác thực không hợp lệ. Vui lòng thử lại.</p>}
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="text-zinc-500">
                  {canResend ? (
                    <button type="button" onClick={() => { void handleResend(); }} className="flex items-center gap-1 font-semibold text-[#1a7a1a] underline-offset-2 transition-colors hover:text-[#0d5c0d]">
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Gửi lại mã mới</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-[#1a7a1a]" />Gửi lại sau <strong className="text-zinc-300">{countdown}s</strong></span>
                  )}
                </div>
                <span className={`shrink-0 font-medium ${isOtpExpired ? "text-rose-400" : "text-zinc-400"}`}>
                  {isOtpExpired ? "Mã OTP đã hết hạn" : `Hết hạn sau ${otpMinutes}:${otpSeconds}`}
                </span>
              </div>

              <button type="submit" disabled={isVerifying || isOtpExpired || otp.join("").length < 6} className={PRIMARY_BTN}>
                {isVerifying ? <ButtonSpinner /> : <><span>Xác nhận mã OTP</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <div className={FOOTER_TEXT}>
              <button type="button" onClick={() => onNavigate("login")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-400 transition-colors hover:text-white">
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

interface AuthFlowProps {
  initialView?: "login" | "register" | "forgot-password";
}

export default function AuthFlow({ initialView = "login" }: AuthFlowProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [otpTarget, setOtpTarget] = useState("nhanvien@asiafnb.com");
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>("registration");

  const showToast = useCallback((title: string, message?: string, type: ToastType = "info") => {
    const notify = type === "success" ? toast.success : type === "error" ? toast.error : toast.info;
    notify(title, { description: message });
  }, []);
  /** Register / forgot-password both hand the email over to the OTP screen. */
  const goToOtp = (email: string, purpose: OtpPurpose = "password-reset") => {
    setOtpTarget(email);
    setOtpPurpose(purpose);
    setView("otp");
  };

  const router = useRouter();

  const navigateAuthView = (nextView: AuthView) => {
    if (nextView === "register") {
      router.push("/admin/register");
      return;
    }
    if (nextView === "forgot-password") {
      router.push("/admin/forgot-password");
      return;
    }
    if (nextView === "login") {
      router.push("/admin/login");
      return;
    }
    setView(nextView);
  };

  /** A successful OTP confirmation returns the user to the login screen. */
  const completeOtp = useCallback(() => {
    setView("login");
    router.replace("/admin/login");
  }, [router]);

  return (
    <main className="relative flex min-h-screen flex-col justify-between selection:bg-[#f5c800] selection:text-black">
      <AmbientBackground />

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-5xl">
          {view === "login" && <LoginScreen onNavigate={navigateAuthView} showToast={showToast} />}

          {view === "register" && (
            <RegisterScreen
              onNavigate={navigateAuthView}
              onRegisterSuccess={(email) => goToOtp(email, "registration")}
              showToast={showToast}
            />
          )}

          {view === "forgot-password" && (
            <ForgotPasswordScreen onNavigate={navigateAuthView} onRequestOtp={(email) => goToOtp(email, "password-reset")} showToast={showToast} />
          )}

          {view === "otp" && (
            <OtpScreen
              onNavigate={navigateAuthView}
              target={otpTarget}
              purpose={otpPurpose}
              showToast={showToast}
              onAuthenticated={completeOtp}
            />
          )}
        </div>
      </div>

      <footer className="mx-auto w-full max-w-5xl border-t border-white/10 px-4 py-6 text-xs text-zinc-500">
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#f5c800]" />
          <span>Asia Internal Portal • Hệ thống xác thực nội bộ Asia Food &amp; Beverage</span>
        </div>
      </footer>
    </main>
  );
}
