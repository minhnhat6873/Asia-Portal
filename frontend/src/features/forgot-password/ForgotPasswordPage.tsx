"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
export default function ForgotPasswordPage() {
  const router = useRouter();
  const recovery = useRecovery();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [busy, setBusy] = useState(false);
  return (
    <section className="view">
      <header className="intro">
        <h1>Quên mật khẩu</h1>
        <p>Nhập email đã đăng ký để nhận mã xác thực.</p>
      </header>
      <form
        noValidate
        aria-busy={busy}
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          const error = validate(
            "email",
            values.email,
            values,
            "forgot-password",
          );
          setErrors({ email: error });
          if (error) return;
          setBusy(true);
          try {
            const result = await userAuthService.forgot(values.email.trim().toLowerCase());
            recovery.start(result.email, "reset", result.expiresInSeconds);
            showToast("Đã gửi yêu cầu", "Nếu thông tin hợp lệ, mã xác thực sẽ được gửi đến email của bạn.", "success");
            router.push("/otp");
          } catch (error) {
            const serverErrors = error instanceof ApiError ? fieldErrorsFromApi(error.fieldErrors) : {};
            if (serverErrors.email) setErrors({ email: serverErrors.email });
            showToast("Không thể gửi mã", serverErrors.email ?? (error instanceof Error ? error.message : "Không thể gửi yêu cầu. Vui lòng thử lại."), "error");
          } finally { setBusy(false); }
        }}
      >
        <fieldset className="auth-controls" disabled={busy}><AuthField
          name="email"
          mode="forgot-password"
          values={values}
          setValues={setValues}
          errors={errors}
          setErrors={setErrors}
        /></fieldset>
        <button className="primary" type="submit" disabled={busy}>
          {busy && <span className="login-spinner" aria-hidden="true" />}
          {busy ? "Đang gửi mã…" : "Gửi mã xác thực"}
        </button>
      </form>
      <p className="switch">
        <Link href="/login">Quay lại đăng nhập</Link>
      </p>
    </section>
  );
}
