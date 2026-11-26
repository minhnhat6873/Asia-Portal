"use client";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRecovery } from "@/features/auth/RecoveryContext";
import { showToast } from "@/features/admin/auth/notify";
import { userAuthService } from "@/services/user-auth.service";
export default function OtpPage() {
  const recovery = useRecovery();
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useState(60);
  useEffect(() => {
    const timer = window.setInterval(() => setWait((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!recovery.email && !complete) router.replace("/forgot-password");
  }, [recovery.email, complete, router]);
  if (complete)
    return (
      <section className="view">
        <header className="intro">
          <h1>Đăng ký thành công</h1>
          <p>
            Email đã được xác minh. Tài khoản đang chờ admin phê duyệt trước khi đăng nhập.
          </p>
        </header>
        <Link className="primary" href="/login">
          Quay về đăng nhập
        </Link>
      </section>
    );
  if (!recovery.email) return null;
  return (
    <section className="view">
      <header className="intro">
        <h1>Xác nhận email</h1>
        <p>
          Nhập mã OTP gồm 6 chữ số cho email <strong>{recovery.email}</strong>.
        </p>
      </header>
      <form
        noValidate
        aria-busy={busy || resending}
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || resending) return;
          if (!/^\d{6}$/.test(otp)) {
            setError("Vui lòng nhập mã OTP gồm 6 chữ số.");
            return;
          }
          setBusy(true); setError("");
          try {
            await userAuthService.verify(recovery.email, otp, recovery.purpose);
            if (recovery.purpose === "register") {
              setComplete(true); recovery.clear();
              showToast("Đăng ký thành công!", "Tài khoản đang chờ admin phê duyệt.", "success");
            } else {
              recovery.verify(otp);
              showToast("Xác thực thành công!", "Bạn có thể đặt mật khẩu mới.", "success");
              router.push("/reset-password");
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể xác thực. Vui lòng thử lại.";
            setError(message);
            showToast("Xác thực chưa thành công", message, "error");
          } finally { setBusy(false); }
        }}
      >
        <div className="field">
          <div className="above">
            <label htmlFor="public-otp">Mã xác thực</label>
          </div>
          <div className={"input-wrap " + (error ? "invalid" : "")}>
            <LockKeyhole className="icon" aria-hidden="true" />
            <input
              id="public-otp"
              disabled={busy || resending}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="Nhập mã 6 chữ số"
              value={otp}
              aria-invalid={!!error}
              aria-describedby="public-otp-error"
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
            />
          </div>
          <p
            id="public-otp-error"
            className="error"
            hidden={!error}
            role="alert"
          >
            {error}
          </p>
        </div>
        <button className="primary" type="submit" disabled={busy || resending}>
          {busy && <span className="login-spinner" aria-hidden="true" />}
          {busy ? "Đang xác nhận…" : "Xác nhận"}
        </button>
        <p className="help">Nếu thông tin hợp lệ, mã được gửi đến email của bạn và có hiệu lực 3 phút. Kiểm tra cả thư rác.</p>
        <button type="button" disabled={wait > 0 || busy || resending} onClick={async () => {
          setResending(true); setError("");
          try {
            const result = await userAuthService.resend(recovery.email, recovery.purpose);
            recovery.start(result.email, recovery.purpose, result.expiresInSeconds);
            setOtp(""); setWait(result.resendAfterSeconds);
            showToast("Đã gửi lại mã", "Vui lòng kiểm tra hộp thư email của bạn, kể cả thư rác.", "success");
          } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể gửi lại mã.";
            setError(message);
            showToast("Không thể gửi lại mã", message, "error");
          }
          finally { setResending(false); }
        }}>{resending ? "Đang gửi mã…" : wait > 0 ? `Gửi lại mã sau ${wait}s` : "Gửi lại mã"}</button>
      </form>
      <p className="switch">
        <Link
          href={
            recovery.purpose === "register" ? "/register" : "/forgot-password"
          }
        >
          Quay lại
        </Link>
      </p>
    </section>
  );
}
