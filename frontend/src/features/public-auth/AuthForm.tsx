"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useRecovery } from "@/features/auth/RecoveryContext";
import AuthField from "./AuthField";
import { fieldErrorsFromApi, initial, validate, type FieldName } from "./validation";

import { showToast } from "@/features/admin/auth/notify";
import { ApiError } from "@/services/api";
import { userAuthService } from "@/services/user-auth.service";
import { afterLoginPath } from "@/lib/safeRedirect";
const titles: Record<"login" | "register", string> = {
  login: "Đăng nhập",
  register: "Đăng ký tài khoản",
};
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [values, setValues] = useState(initial),
    [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({}),
    [remember, setRemember] = useState(false);
  const router = useRouter();
  const recovery = useRecovery();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fields: FieldName[] =
    mode === "register"
      ? ["name", "phone", "email", "password", "confirm"]
      : mode === "login"
        ? ["email", "password"]
        : ["email"];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    const next: Partial<Record<FieldName, string>> = {};
    fields.forEach((field) => {
      next[field] = validate(field, values[field], values, mode);
    });
    setErrors(next);
    const first = fields.find((field) => next[field]);
    if (first) {
      document.getElementById(`${mode}-${first}`)?.focus();
      return;
    }
    setIsSubmitting(true);
    try {
      const email = values.email.trim().toLowerCase();
      if (mode === "register") {
        const result = await userAuthService.register({ name: values.name.trim(), phone: values.phone, email, password: values.password, confirmPassword: values.confirm });
        recovery.start(result.email, "register", result.expiresInSeconds);
        setValues((v) => ({ ...v, password: "", confirm: "" }));
        showToast("Đã gửi mã xác thực", "Nếu thông tin hợp lệ, mã xác thực sẽ được gửi đến email của bạn.", "success");
        router.push("/otp");
      } else {
        const account = await userAuthService.login(email, values.password, remember);
        setValues((v) => ({ ...v, password: "", confirm: "" }));
        showToast("Đăng nhập thành công!", `Chào mừng, ${account.name}.`, "success");
        // Back to the internal page that asked for sign-in; only paths on this site.
        router.replace(afterLoginPath(new URLSearchParams(window.location.search).get("next")));
      }
    } catch (error) {
      const title = mode === "login" ? "Đăng nhập không thành công" : "Đăng ký không thành công";
      // Show backend validation messages under their fields as well as in the toast.
      const serverErrors = error instanceof ApiError ? fieldErrorsFromApi(error.fieldErrors) : {};
      const firstServerError = fields.find((field) => serverErrors[field]);
      if (firstServerError) {
        setErrors(serverErrors);
        showToast(title, serverErrors[firstServerError], "error");
        // Inputs are disabled while submitting; focus once they are enabled again.
        window.setTimeout(() => document.getElementById(`${mode}-${firstServerError}`)?.focus(), 0);
      } else {
        showToast(title, error instanceof Error ? error.message : "Không thể kết nối. Vui lòng thử lại.", "error");
      }
    } finally { setIsSubmitting(false); }
  }
  const field = (name: FieldName) => (
    <AuthField
      key={name}
      name={name}
      mode={mode}
      values={values}
      setValues={setValues}
      errors={errors}
      setErrors={setErrors}
    />
  );
  return (
    <section className="view" aria-labelledby={`${mode}-title`}>
      <header className="intro">
        <h1 id={`${mode}-title`}>{titles[mode]}</h1>
        {mode === "login" && (
          <p>Truy Cập Cổng Thông Tin Nội Bộ Asia Food &amp; Beverage</p>
        )}
      </header>
      <form noValidate onSubmit={submit} aria-busy={isSubmitting}>
        <fieldset className="auth-controls" disabled={isSubmitting}>
        <div className="fields">
          {mode === "register" ? (
            <>
              <div className="field-pair">
                {field("name")}
                {field("phone")}
              </div>
              {fields.slice(2).map(field)}
            </>
          ) : (
            fields.map(field)
          )}
        </div>
        {mode === "login" && (
          <div className="options">
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Ghi nhớ đăng nhập
            </label>
            <Link href="/forgot-password" tabIndex={isSubmitting ? -1 : undefined}>Quên mật khẩu?</Link>
          </div>
        )}
        </fieldset>
        <button className="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting && <span className="login-spinner" aria-hidden="true" />}
          {isSubmitting ? (mode === "login" ? "Đang đăng nhập…" : "Đang gửi mã…") : mode === "register" ? "Đăng ký" : "Đăng nhập"}
        </button>
      </form>
      {mode !== "login" && (
        <p className="switch">
          {mode === "register" ? "Đã có tài khoản?" : ""}
          <Link href="/login">Đăng nhập</Link>
        </p>
      )}
    </section>
  );
}
