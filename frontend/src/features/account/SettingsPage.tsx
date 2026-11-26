"use client";

import { Eye, EyeOff, KeyRound, MonitorSmartphone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/services/api";
import { userAuthService } from "@/services/user-auth.service";
import { showToast } from "@/features/admin/auth/notify";
import { getPasswordValidationError, PASSWORD_MAX_LENGTH, PASSWORD_REQUIREMENTS } from "@/lib/password-validation";
import AccountShell, { Card } from "./AccountShell";
import NotificationSettingsCard from "./NotificationSettingsCard";

type Field = "currentPassword" | "password" | "confirmPassword";
const EMPTY: Record<Field, string> = { currentPassword: "", password: "", confirmPassword: "" };
const LABELS: Record<Field, string> = { currentPassword: "Mật khẩu hiện tại", password: "Mật khẩu mới", confirmPassword: "Nhập lại mật khẩu mới" };

export function validatePasswordChange(values: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!values.currentPassword) errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
  const policy = getPasswordValidationError(values.password);
  if (policy) errors.password = policy === "Vui lòng nhập mật khẩu." ? "Vui lòng nhập mật khẩu mới." : policy;
  else if (values.password === values.currentPassword) errors.password = "Mật khẩu mới phải khác mật khẩu hiện tại.";
  if (!values.confirmPassword) errors.confirmPassword = "Vui lòng nhập lại mật khẩu mới.";
  else if (values.confirmPassword !== values.password) errors.confirmPassword = "Xác nhận mật khẩu không khớp.";
  return errors;
}

function PasswordInput({ name, value, error, disabled, onChange }: { name: Field; value: string; error?: string; disabled: boolean; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  const id = `settings-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">{LABELS[name]}<span className="text-rose-500"> *</span></label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          disabled={disabled}
          maxLength={name === "currentPassword" ? 128 : PASSWORD_MAX_LENGTH}
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 pr-11 text-sm text-slate-900 outline-none transition focus:ring-2 disabled:bg-slate-50 ${error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"}`}
        />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
          {visible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
        </button>
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const change = (field: Field) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const next = validatePasswordChange(values);
    setErrors(next);
    const first = (Object.keys(EMPTY) as Field[]).find((field) => next[field]);
    if (first) { document.getElementById(`settings-${first}`)?.focus(); return; }
    setSaving(true);
    try {
      await userAuthService.changePassword(values);
      setValues(EMPTY);
      showToast("Đã đổi mật khẩu", "Các thiết bị khác đã được đăng xuất. Thiết bị này vẫn đăng nhập.", "success");
    } catch (reason) {
      if (reason instanceof ApiError && Object.keys(reason.fieldErrors).length) {
        setErrors(reason.fieldErrors as Partial<Record<Field, string>>);
        showToast("Không đổi được mật khẩu", Object.values(reason.fieldErrors)[0], "error");
      } else {
        showToast("Không đổi được mật khẩu", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
      }
    } finally { setSaving(false); }
  };

  const logoutOthers = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const { count } = await userAuthService.logoutOthers();
      showToast("Đã xử lý", count ? `Đã đăng xuất ${count} phiên trên các thiết bị khác.` : "Không có thiết bị nào khác đang đăng nhập.", "success");
    } catch (reason) {
      showToast("Không thể đăng xuất thiết bị khác", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
    } finally { setSigningOut(false); }
  };

  return (
    <AccountShell title="Cài đặt tài khoản" description="Đổi mật khẩu, quản lý phiên đăng nhập và thông báo.">
      <div className="space-y-5">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><KeyRound aria-hidden="true" size={20} /></span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Đổi mật khẩu</h2>
              <p className="text-xs text-slate-500">Sau khi đổi, các thiết bị khác sẽ phải đăng nhập lại.</p>
            </div>
          </div>
          <form noValidate onSubmit={submit} className="mt-5 max-w-md space-y-4">
            <PasswordInput name="currentPassword" value={values.currentPassword} error={errors.currentPassword} disabled={saving} onChange={change("currentPassword")} />
            <PasswordInput name="password" value={values.password} error={errors.password} disabled={saving} onChange={change("password")} />
            <p className="-mt-2 text-xs leading-5 text-slate-500">{PASSWORD_REQUIREMENTS}</p>
            <PasswordInput name="confirmPassword" value={values.confirmPassword} error={errors.confirmPassword} disabled={saving} onChange={change("confirmPassword")} />
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
              {saving ? "Đang lưu…" : "Đổi mật khẩu"}
            </button>
          </form>
        </Card>

        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><MonitorSmartphone aria-hidden="true" size={20} /></span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Đăng xuất khỏi các thiết bị khác</h2>
                <p className="text-xs text-slate-500">Dùng khi bạn quên đăng xuất ở máy khác hoặc nghi ngờ người khác dùng tài khoản.</p>
              </div>
            </div>
            <button type="button" onClick={() => void logoutOthers()} disabled={signingOut} className="shrink-0 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60">
              {signingOut ? "Đang xử lý…" : "Đăng xuất thiết bị khác"}
            </button>
          </div>
        </Card>

        <NotificationSettingsCard />
      </div>
    </AccountShell>
  );
}
