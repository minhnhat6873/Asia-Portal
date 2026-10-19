"use client";

import { useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Role, NewUserInput } from "../types";
import { checkAccountContacts } from "@/services/access-control.service";
import { ApiError } from "@/services/api";
import {
  normalizeAccountPhone, validateCreateAccount,
  type CreateAccountFormErrors, type CreateAccountFormValues,
} from "../create-account.validation";

interface Props {
  roles: Role[];
  onCancel: () => void;
  onSave: (user: NewUserInput) => Promise<boolean>;
}

const fields: { key: keyof CreateAccountFormValues; label: string; type: string; autoComplete: string; maxLength: number; placeholder?: string }[] = [
  { key: "name", label: "Họ và tên", type: "text", autoComplete: "name", maxLength: 100 },
  { key: "email", label: "Email đăng nhập", type: "email", autoComplete: "email", maxLength: 150, placeholder: "ten@asiafnb.com" },
  { key: "password", label: "Mật khẩu", type: "password", autoComplete: "new-password", maxLength: 100, placeholder: "Từ 8 đến 100 ký tự" },
  { key: "confirmPassword", label: "Xác nhận mật khẩu", type: "password", autoComplete: "new-password", maxLength: 100 },
  { key: "phone", label: "Số điện thoại", type: "tel", autoComplete: "tel", maxLength: 30, placeholder: "0901234567 hoặc +84901234567" },
];

export function CreateAccountPage({ roles, onCancel, onSave }: Props) {
  const [values, setValues] = useState<CreateAccountFormValues>({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
  const [errors, setErrors] = useState<CreateAccountFormErrors>({});
  const [showPassword, setShowPassword] = useState({ password: false, confirmPassword: false });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [accountRole, setAccountRole] = useState<"admin" | "manager">("manager");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const valuesRef = useRef(values);
  const contactRequests = useRef({ email: 0, phone: 0 });

  const blurField = async (key: keyof CreateAccountFormValues) => {
    const snapshot = valuesRef.current;
    const localError = validateCreateAccount(snapshot)[key];
    setErrors((current) => ({ ...current, [key]: localError }));
    if (localError || (key !== "email" && key !== "phone")) return;
    const request = ++contactRequests.current[key];
    const value = key === "email" ? snapshot.email.trim().toLowerCase() : normalizeAccountPhone(snapshot.phone);
    try {
      const result = await checkAccountContacts({ [key]: value });
      if (request !== contactRequests.current[key] || valuesRef.current[key] !== snapshot[key]) return;
      const taken = key === "email" ? result.emailAvailable === false : result.phoneAvailable === false;
      setErrors((current) => ({ ...current, [key]: taken ? key === "email" ? "Email đã được sử dụng." : "Số điện thoại đã được sử dụng." : undefined }));
    } catch {
      // Saving always rechecks contacts on the server, even if this early check fails.
    }
  };

  const changeField = (key: keyof CreateAccountFormValues, value: string) => {
    const next = { ...values, [key]: value };
    valuesRef.current = next;
    if (key === "email" || key === "phone") contactRequests.current[key]++;
    setValues(next);
    setSaveError("");
    const nextErrors = validateCreateAccount(next);
    setErrors((current) => ({
      ...current,
      [key]: current[key] ? nextErrors[key] : undefined,
      ...(key === "password" && next.confirmPassword ? { confirmPassword: nextErrors.confirmPassword } : {}),
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const nextErrors = validateCreateAccount(values);
    setErrors(nextErrors);
    const firstInvalid = fields.find((field) => nextErrors[field.key]);
    if (firstInvalid) {
      document.getElementById(`create-account-${firstInvalid.key}`)?.focus();
      return;
    }
    setSaving(true);
    setSaveError("");
    // Ignore any in-flight blur checks; the POST response is authoritative.
    contactRequests.current.email++;
    contactRequests.current.phone++;
    try {
      if (await onSave({
        name: values.name.trim(), email: values.email.trim().toLowerCase(),
        password: values.password, confirmPassword: values.confirmPassword,
        phone: normalizeAccountPhone(values.phone), accountRole, roleIds: accountRole === "admin" ? [] : roleIds,
      })) onCancel();
    } catch (error) {
      const fieldErrors: CreateAccountFormErrors = {};
      if (error instanceof ApiError) {
        for (const field of fields) {
          if (error.fieldErrors[field.key]) fieldErrors[field.key] = error.fieldErrors[field.key];
        }
      }
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        const first = fields.find((field) => fieldErrors[field.key]);
        document.getElementById(`create-account-${first?.key}`)?.focus();
      } else setSaveError(error instanceof Error ? error.message : "Không thể tạo tài khoản. Vui lòng thử lại.");
    } finally { setSaving(false); }
  };

  return (
    <section aria-labelledby="create-account-title" className="asia-access-control w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm sm:p-6">
        <h2 id="create-account-title" className="mb-6 text-xl font-bold">Thông tin tài khoản</h2>
        <form noValidate onSubmit={(event) => void submit(event)} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {saveError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{saveError}</p>}
          {fields.map((field) => {
            const id = `create-account-${field.key}`;
            const passwordField = field.key === "password" || field.key === "confirmPassword" ? field.key : null;
            return (
              <div key={field.key}>
                <label htmlFor={id} className="block text-sm font-semibold">{field.label} <span aria-hidden="true" className="text-rose-600">*</span></label>
                <div className="relative mt-1.5">
                  <input
                    id={id} name={field.key} required disabled={saving}
                    type={passwordField && showPassword[passwordField] ? "text" : field.type}
                    autoComplete={field.autoComplete} maxLength={field.maxLength} placeholder={field.placeholder}
                    spellCheck={field.key === "name" ? undefined : false}
                    autoCapitalize={field.key === "email" ? "none" : undefined}
                    value={values[field.key]} onChange={(event) => changeField(field.key, event.target.value)}
                    onBlur={() => void blurField(field.key)}
                    aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `${id}-error` : undefined}
                    className={`min-h-12 w-full rounded-xl border bg-white px-3 py-2 text-base outline-none focus:ring-2 disabled:bg-slate-50 ${passwordField ? "pr-12" : ""} ${errors[field.key] ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-100"}`}
                  />
                  {passwordField && <button type="button" disabled={saving} onClick={() => setShowPassword((current) => ({ ...current, [passwordField]: !current[passwordField] }))} aria-label={`${showPassword[passwordField] ? "Ẩn" : "Hiện"} ${passwordField === "password" ? "mật khẩu" : "xác nhận mật khẩu"}`} aria-pressed={showPassword[passwordField]} className="absolute right-0 top-0 flex h-full w-12 items-center justify-center rounded-r-xl text-slate-500 hover:text-emerald-700">{showPassword[passwordField] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>}
                </div>
                {errors[field.key] && <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-rose-600">{errors[field.key]}</p>}
              </div>
            );
          })}
          <div>
            <label htmlFor="create-account-role" className="block text-sm font-semibold">Loại tài khoản</label>
            <select id="create-account-role" disabled={saving} value={accountRole} onChange={(event) => setAccountRole(event.target.value as "admin" | "manager")} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-emerald-100">
              <option value="manager">Quản lý</option><option value="admin">Admin gốc</option>
            </select>
          </div>
          {accountRole === "admin" ? <p className="rounded-xl bg-orange-50 p-4 text-sm text-orange-800 sm:col-span-2">Admin gốc có toàn bộ quyền hệ thống và có thể quản lý các tài khoản Admin gốc khác.</p> : <fieldset disabled={saving} className="space-y-2 rounded-xl border border-slate-200 p-3 sm:col-span-2">
            <legend className="px-1 text-sm font-semibold">Nhóm quyền</legend>
            {roles.length ? roles.map((role) => <label key={role.id} className="flex cursor-pointer items-center gap-3 py-1 text-sm"><input type="checkbox" checked={roleIds.includes(role.id)} onChange={(event) => setRoleIds((current) => event.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id))} className="h-5 w-5 accent-emerald-700" />{role.name}</label>) : <p className="text-sm text-slate-500">Chưa có nhóm quyền. Bạn có thể gán sau khi tạo.</p>}
          </fieldset>}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2">
            <button type="button" disabled={saving} onClick={onCancel} className="min-h-12 rounded-xl border border-slate-200 px-4">Hủy</button>
            <button type="submit" disabled={saving} className="min-h-12 rounded-xl bg-emerald-700 px-5 font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Tạo tài khoản"}</button>
          </footer>
        </form>
    </section>
  );
}
