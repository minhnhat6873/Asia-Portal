"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { changeAdminEmail, requestAdminEmailChangeOtp, resendAdminEmailChangeOtp, type PasswordChangeOtpRequest } from "@/features/admin/login/auth.service";
import { getAdminSession, setAdminSession } from "@/lib/adminSession";
import { ApiError } from "@/services/api";

type PendingRequest = { requestId: string; email: string; expiresAt: number; resendAt: number };
const PRIMARY = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError && cause.errors.length) return cause.errors.join(" ");
  return cause instanceof Error ? cause.message : fallback;
}

export function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changedEmail, setChangedEmail] = useState("");

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
    setError(""); setChangedEmail("");
    const normalized = newEmail.trim().toLowerCase();
    if (!normalized) { setError("Vui lòng nhập email mới."); return; }
    if (normalized.length > 150) { setError("Email không được vượt quá 150 ký tự."); return; }
    if (normalized.split("@")[0].length > 64) { setError("Phần tên trước @ không được vượt quá 64 ký tự."); return; }
    if (!/^[a-z0-9_%+-]+(?:\.[a-z0-9_%+-]+)*@asiafnb\.com$/.test(normalized)) { setError("Vui lòng nhập email hợp lệ có đuôi @asiafnb.com."); return; }
    if (normalized === currentEmail.trim().toLowerCase()) { setError("Email mới phải khác email hiện tại."); return; }
    setBusy(true);
    try { acceptRequest(await requestAdminEmailChangeOtp(normalized)); }
    catch (cause) { setError(errorMessage(cause, "Không thể gửi mã OTP. Vui lòng thử lại.")); }
    finally { setBusy(false); }
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!pending || busy) return;
    setError("");
    if (!/^\d{6}$/.test(code)) { setError("Vui lòng nhập mã OTP gồm 6 chữ số."); return; }
    if (!remaining) { setError("Mã OTP đã hết hạn. Vui lòng nhập lại email để nhận mã mới."); return; }
    setBusy(true);
    try {
      const result = await changeAdminEmail(pending.requestId, code);
      const session = getAdminSession();
      if (session) setAdminSession({ ...session, email: result.email });
      setPending(null); setCode(""); setNewEmail(""); setChangedEmail(result.email);
    } catch (cause) { setError(errorMessage(cause, "Không thể xác nhận đổi email.")); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    if (!pending || busy || resendWait || !remaining) return;
    setBusy(true); setError("");
    try { acceptRequest(await resendAdminEmailChangeOtp(pending.requestId)); }
    catch (cause) { setError(errorMessage(cause, "Không thể gửi lại mã OTP.")); }
    finally { setBusy(false); }
  };

  return <section className="mx-auto max-w-md space-y-5 text-slate-800" aria-labelledby="email-change-heading">
    <div>
      <h2 id="email-change-heading" className="text-xl font-bold">Đổi email</h2>
      <p className="mt-2 break-all text-sm text-slate-600">Email hiện tại: <strong>{currentEmail}</strong></p>
    </div>
    {pending ? <>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm">
        <p className="font-bold text-emerald-800">Xác nhận email mới</p>
        <p className="mt-1">Mã OTP đã được gửi đến <strong className="break-all">{pending.email}</strong>. Nhập mã để hoàn tất đổi email.</p>
      </div>
      <form noValidate onSubmit={(event) => void confirm(event)} className="space-y-4">
        <div>
          <label htmlFor="email-change-otp" className="mb-2 block text-sm font-semibold">Mã OTP</label>
          <input id="email-change-otp" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={busy} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} placeholder="Nhập mã gồm 6 chữ số" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-xl tracking-[0.3em] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
          <p className={`mt-2 text-sm ${remaining ? "text-slate-500" : "text-rose-700"}`}>{remaining ? `Mã hết hạn sau ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Mã OTP đã hết hạn. Vui lòng nhập lại email."}</p>
        </div>
        <button type="submit" disabled={busy || !remaining} className={PRIMARY}><ShieldCheck aria-hidden="true" className="h-4 w-4" />{busy ? "Đang xử lý..." : "Xác nhận đổi email"}</button>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" disabled={busy || resendWait > 0 || !remaining} onClick={() => void resend()} className="min-h-10 rounded-lg px-2 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">{resendWait ? `Gửi lại mã (${resendWait}s)` : "Gửi lại mã OTP"}</button>
          <button type="button" disabled={busy} onClick={() => { setPending(null); setCode(""); setError(""); }} className="min-h-10 rounded-lg px-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">Nhập lại email</button>
        </div>
      </form>
    </> : <>
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Nhập email công ty mới có đuôi @asiafnb.com. Email đăng nhập chỉ thay đổi sau khi bạn xác nhận OTP gửi đến email mới.</p>
      <form noValidate onSubmit={(event) => void requestOtp(event)} className="space-y-5">
        <div>
          <label htmlFor="new-email" className="mb-2 block text-sm font-semibold">Email mới</label>
          <input id="new-email" name="newEmail" type="email" autoComplete="email" maxLength={150} disabled={busy} value={newEmail} onChange={(event) => { setNewEmail(event.target.value); setError(""); setChangedEmail(""); }} placeholder="tenban@asiafnb.com" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" />
        </div>
        <button type="submit" disabled={busy} className={PRIMARY}><Mail aria-hidden="true" className="h-4 w-4" />{busy ? "Đang gửi mã OTP..." : "Gửi mã OTP đến email mới"}</button>
      </form>
    </>}
    {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
    {changedEmail && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>Đổi email thành công! Từ lần đăng nhập tiếp theo, hãy dùng <strong className="break-all">{changedEmail}</strong>.</span></p>}
  </section>;
}
