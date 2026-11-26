"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRecovery } from "@/features/auth/RecoveryContext";
import AuthField from "@/features/public-auth/AuthField";
import { userAuthService } from "@/services/user-auth.service";
import {
  fieldErrorsFromApi,
  initial,
  validate,
  type FieldName,
} from "@/features/public-auth/validation";
import { showToast } from "@/features/admin/auth/notify";
import { ApiError } from "@/services/api";
export default function ResetPasswordPage() {
  const recovery = useRecovery();
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    if (!complete && (!recovery.email || !recovery.code || recovery.purpose !== "reset"))
      router.replace("/forgot-password");
  }, [recovery.email, recovery.code, recovery.purpose, complete, router]);
  if (complete) return <section className="view"><header className="intro"><h1>Đặt lại mật khẩu thành công</h1><p>Vui lòng đăng nhập bằng mật khẩu mới.</p></header><Link className="primary" href="/login">Đăng nhập</Link></section>;
  if (!recovery.email || !recovery.code || recovery.purpose !== "reset")
    return null;
  return (
    <section className="view">
      <header className="intro">
        <h1>Đặt lại mật khẩu</h1>
        <p>Tạo mật khẩu mới cho tài khoản {recovery.email}.</p>
      </header>
      <form
        noValidate
        aria-busy={busy}
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          const next = {
            password: validate("password", values.password, values, "register"),
            confirm: validate("confirm", values.confirm, values, "register"),
          };
          setErrors(next);
          if (next.password || next.confirm) return;
          setBusy(true);
          try {
            await userAuthService.reset(recovery.email, recovery.code, values.password, values.confirm);
            setValues(initial); setComplete(true); recovery.clear();
            showToast("Đặt lại mật khẩu thành công!", "Vui lòng đăng nhập bằng mật khẩu mới.", "success");
          } catch (error) {
            const serverErrors = error instanceof ApiError ? fieldErrorsFromApi(error.fieldErrors) : {};
            if (serverErrors.password || serverErrors.confirm) setErrors({ password: serverErrors.password, confirm: serverErrors.confirm });
            showToast("Đặt lại mật khẩu không thành công", serverErrors.password ?? serverErrors.confirm ?? (error instanceof Error ? error.message : "Không thể đặt lại mật khẩu."), "error");
          }
          finally { setBusy(false); }
        }}
      >
        <fieldset className="auth-controls" disabled={busy}><div className="fields">
          {(["password", "confirm"] as const).map((name) => (
            <AuthField
              key={name}
              name={name}
              mode="register"
              values={values}
              setValues={setValues}
              errors={errors}
              setErrors={setErrors}
            />
          ))}
        </div></fieldset>
        <button className="primary" type="submit" disabled={busy}>
          {busy && <span className="login-spinner" aria-hidden="true" />}
          {busy ? "Đang lưu…" : "Đặt lại mật khẩu"}
        </button>
      </form>
      <p className="switch">
        <Link href="/otp">Quay lại nhập mã</Link>
      </p>
    </section>
  );
}
