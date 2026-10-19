"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { changeAdminPassword, requestAdminPasswordChangeOtp, resendAdminPasswordChangeOtp, type PasswordChangeOtpRequest } from "@/features/admin/login/auth.service";

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";
type PendingRequest = { requestId: string; email: string; expiresAt: number; resendAt: number };
const EMPTY_PASSWORDS = { currentPassword: "", newPassword: "", confirmPassword: "" };
const FIELDS: { key: PasswordField; label: string; placeholder: string; autoComplete: string }[] = [
  { key: "currentPassword", label: "Mật khẩu hiện tại", placeholder: "Nhập mật khẩu hiện tại", autoComplete: "current-password" },
  { key: "newPassword", label: "Mật khẩu mới", placeholder: "Nhập mật khẩu mới (tối thiểu 8 ký tự)", autoComplete: "new-password" },
  { key: "confirmPassword", label: "Xác nhận mật khẩu mới", placeholder: "Nhập lại mật khẩu mới", autoComplete: "new-password" },
];
const PRIMARY = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

export function PasswordChangeForm() {
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [visible, setVisible] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  const acceptRequest = (request: PasswordChangeOtpRequest) => {
    const current = Date.now();
    setNow(current);
    setPending({ requestId: request.requestId, email: request.email, expiresAt: current + request.expiresInSeconds * 1000, resendAt: current + request.resendAfterSeconds * 1000 });
    setCode("");
  };
  const remaining = pending ? Math.max(0, Math.ceil((pending.expiresAt - now) / 1000)) : 0;
  const resendWait = pending ? Math.max(0, Math.ceil((pending.resendAt - now) / 1000)) : 0;

  const requestOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(""); setSuccess("");
    if (!passwords.currentPassword) { setError("Vui lòng nhập mật khẩu hiện tại."); return; }
    if (passwords.newPassword.length < 8 || passwords.newPassword.length > 100 || !passwords.newPassword.trim()) { setError("Mật khẩu mới phải từ 8 đến 100 ký tự và không được chỉ gồm khoảng trắng."); return; }
    if (passwords.newPassword === passwords.currentPassword) { setError("Mật khẩu mới phải khác mật khẩu hiện tại."); return; }
    if (passwords.confirmPassword !== passwords.newPassword) { setError("Mật khẩu xác nhận không khớp."); return; }
    setBusy(true);
    try {
      acceptRequest(await requestAdminPasswordChangeOtp(passwords.currentPassword, passwords.newPassword));
      setPasswords(EMPTY_PASSWORDS);
      setVisible({ currentPassword: false, newPassword: false, confirmPassword: false });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể gửi mã OTP. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!pending || busy) return;
    setError("");
    if (!/^\d{6}$/.test(code)) { setError("Vui lòng nhập mã OTP gồm 6 chữ số."); return; }
    if (!remaining) { setError("Mã OTP đã hết hạn. Vui lòng nhập lại mật khẩu để nhận mã mới."); return; }
    setBusy(true);
    try {
      await changeAdminPassword(pending.requestId, code);
      setPending(null); setCode(""); setSuccess("Đổi mật khẩu thành công!");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xác nhận đổi mật khẩu."); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    if (!pending || busy || resendWait) return;
    setBusy(true); setError("");
    try { acceptRequest(await resendAdminPasswordChangeOtp(pending.requestId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể gửi lại mã OTP."); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-md space-y-5 text-slate-800">
    {pending ? <>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3"><Mail aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div className="min-w-0 text-sm">
          <h2 className="font-bold text-emerald-800">Xác nhận qua email</h2>
          <p className="mt-1 break-words">Mã OTP đã được gửi đến <strong className="break-all">{pending.email}</strong>. Nhập mã để hoàn tất đổi mật khẩu.</p>
        </div></div>
      </div>
      <form noValidate onSubmit={(event) => void confirm(event)} className="space-y-4">
        <div>
          <label htmlFor="password-change-otp" className="mb-2 block text-sm font-semibold">Mã OTP</label>
          <input id="password-change-otp" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={busy} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} placeholder="Nhập mã gồm 6 chữ số" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-xl tracking-[0.3em] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
          <p className={`mt-2 text-sm ${remaining ? "text-slate-500" : "text-rose-700"}`}>{remaining ? `Mã hết hạn sau ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Mã OTP đã hết hạn. Vui lòng nhập lại mật khẩu."}</p>
        </div>
        <button type="submit" disabled={busy || !remaining} className={PRIMARY}><ShieldCheck aria-hidden="true" className="h-4 w-4" />{busy ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}</button>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" disabled={busy || resendWait > 0 || !remaining} onClick={() => void resend()} className="min-h-10 rounded-lg px-2 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">{resendWait ? `Gửi lại mã (${resendWait}s)` : "Gửi lại mã OTP"}</button>
          <button type="button" disabled={busy} onClick={() => { setPending(null); setCode(""); setError(""); }} className="min-h-10 rounded-lg px-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">Nhập lại mật khẩu</button>
        </div>
      </form>
    </> : <>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">Xác nhận bảo mật</p>
        <p className="mt-1">Mật khẩu mới phải khác mật khẩu hiện tại và có ít nhất 8 ký tự. Bạn cần xác nhận mã OTP gửi đến email của mình để hoàn tất.</p>
      </div>
      <form noValidate onSubmit={(event) => void requestOtp(event)} className="space-y-5">
        {FIELDS.map((field) => <div key={field.key}>
          <label htmlFor={field.key} className="mb-1.5 block text-sm font-semibold text-slate-600">{field.label}</label>
          <div className="relative">
            <input id={field.key} name={field.key} type={visible[field.key] ? "text" : "password"} disabled={busy} value={passwords[field.key]} maxLength={100} autoComplete={field.autoComplete} onChange={(event) => { setPasswords((current) => ({ ...current, [field.key]: event.target.value })); setError(""); setSuccess(""); }} placeholder={field.placeholder} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" />
            <Lock aria-hidden="true" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <button type="button" disabled={busy} aria-label={`${visible[field.key] ? "Ẩn" : "Hiện"} ${field.label.toLocaleLowerCase("vi")}`} aria-pressed={visible[field.key]} onClick={() => setVisible((current) => ({ ...current, [field.key]: !current[field.key] }))} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-emerald-700">{visible[field.key] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
        </div>)}
        <button type="submit" disabled={busy} className={PRIMARY}><Mail aria-hidden="true" className="h-4 w-4" />{busy ? "Đang gửi mã OTP..." : "Gửi mã OTP xác nhận"}</button>
      </form>
    </>}
    {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
    {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />{success}</p>}
  </div>;
}
