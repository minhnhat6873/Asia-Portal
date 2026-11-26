"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, Crown, Eye, EyeOff, Plus, UserRound, X } from "lucide-react";
import { AccountFilterSelect } from "./AccountFilterSelect";
import { accountFont } from "../account-font";
import type { Role, NewUserInput } from "../types";
import { checkAccountContacts, lookupEmployeesForAccount, type EmployeeLookupResult } from "@/services/access-control.service";
import { ApiError } from "@/services/api";
import { EmployeeLinkPicker } from "./EmployeeLinkPicker";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";
import { navigateWithUnsavedChangesGuard } from "@/lib/unsavedChangesNavigation";
import UnsavedChangesDialog from "@/components/ui/UnsavedChangesDialog";
import { PASSWORD_MAX_LENGTH, PASSWORD_REQUIREMENTS } from "@/lib/password-validation";
import {
  MANAGER_NEEDS_GROUP, normalizeAccountPhone, validateCreateAccount,
  type CreateAccountFormErrors, type CreateAccountFormValues,
} from "../create-account.validation";

interface Props {
  roles: Role[];
  isRootAdmin: boolean;
  onCancel: () => void;
  onSave: (user: NewUserInput) => Promise<boolean>;
}

// Which employee record (if any) the typed email belongs to.
type EmailLink = { email: string; employee: EmployeeLookupResult | null };

// These fields describe another person, so the browser must not suggest the admin's own
// name, email or phone (or earlier entries). Passwords stay "new-password" for the same reason.
const fields: { key: keyof CreateAccountFormValues; label: string; type: string; autoComplete: string; maxLength: number; placeholder?: string }[] = [
  { key: "name", label: "Họ và tên", type: "text", autoComplete: "off", maxLength: 100 },
  { key: "email", label: "Email", type: "email", autoComplete: "off", maxLength: 150, placeholder: "ten@asiafnb.com" },
  { key: "username", label: "Tên đăng nhập", type: "text", autoComplete: "off", maxLength: 100, placeholder: "Tự điền theo email" },
  { key: "phone", label: "Số điện thoại", type: "tel", autoComplete: "off", maxLength: 30 },
  { key: "password", label: "Mật khẩu", type: "password", autoComplete: "new-password", maxLength: PASSWORD_MAX_LENGTH, placeholder: "Từ 8 đến 32 ký tự" },
  { key: "confirmPassword", label: "Xác nhận mật khẩu", type: "password", autoComplete: "new-password", maxLength: PASSWORD_MAX_LENGTH },
];
const TAKEN = { username: "Tên đăng nhập đã được sử dụng.", email: "Email đã được sử dụng.", phone: "Số điện thoại đã được sử dụng." } as const;

export function CreateAccountPage({ roles, isRootAdmin, onCancel, onSave }: Props) {
  const [values, setValues] = useState<CreateAccountFormValues>({ name: "", email: "", username: "", password: "", confirmPassword: "", phone: "" });
  // The username follows the email until someone types a different one (cleared: follows again).
  const usernameTyped = useRef(false);
  const [errors, setErrors] = useState<CreateAccountFormErrors>({});
  const [showPassword, setShowPassword] = useState({ password: false, confirmPassword: false });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [groupError, setGroupError] = useState("");
  // Most new accounts are for staff; managers may only create this type.
  const [accountRole, setAccountRole] = useState<NewUserInput["accountRole"]>("user");
  const [emailLink, setEmailLink] = useState<EmailLink | null>(null);
  const linkRequest = useRef(0);
  const typedEmail = values.email.trim().toLowerCase();
  const currentLink = emailLink?.email === typedEmail ? emailLink : null;
  const formatErrors = validateCreateAccount(values);

  // Look the typed email up in the employee directory to show whether it links to a record.
  const checkEmailLink = async (email: string) => {
    const request = ++linkRequest.current;
    try {
      const results = await lookupEmployeesForAccount(email);
      if (request !== linkRequest.current) return;
      setEmailLink({ email, employee: results.find((item) => item.email.toLowerCase() === email) ?? null });
    } catch { /* The link hint is optional; creating the account does not depend on it. */ }
  };

  const pickEmployee = (employee: EmployeeLookupResult) => {
    const email = employee.email.toLowerCase();
    const next = { ...valuesRef.current, name: employee.name, email, phone: normalizeAccountPhone(employee.phone), ...(usernameTyped.current ? {} : { username: email }) };
    valuesRef.current = next;
    contactRequests.current.username++; contactRequests.current.email++; contactRequests.current.phone++;
    linkRequest.current++;
    setValues(next);
    setEmailLink({ email: next.email, employee });
    setSaveError("");
    // Show problems with the copied data right away, e.g. a landline phone in the record.
    const nextErrors = validateCreateAccount(next);
    setErrors((current) => ({ ...current, name: nextErrors.name, email: nextErrors.email, phone: nextErrors.phone, ...(usernameTyped.current ? {} : { username: undefined }) }));
  };
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const valuesRef = useRef(values);
  const contactRequests = useRef({ username: 0, email: 0, phone: 0 });
  // Anything typed or chosen counts as unsaved: leaving the page (menu, back arrow, browser
  // back, closing the tab, Hủy) asks first instead of silently dropping the new account.
  const hasChanges = Object.values(values).some((value) => value.trim() !== "") || roleIds.length > 0 || accountRole !== "user";
  const navigation = useUnsavedChanges(hasChanges, saving);

  const blurField = async (key: keyof CreateAccountFormValues) => {
    const snapshot = valuesRef.current;
    const localError = validateCreateAccount(snapshot)[key];
    setErrors((current) => ({ ...current, [key]: localError }));
    if (localError || (key !== "username" && key !== "email" && key !== "phone")) return;
    if (key === "email") {
      void checkEmailLink(snapshot.email.trim().toLowerCase());
      // The username was filled from this email: check it too.
      if (!usernameTyped.current) void blurField("username");
    }
    const request = ++contactRequests.current[key];
    const value = key === "phone" ? normalizeAccountPhone(snapshot.phone) : snapshot[key].trim().toLowerCase();
    try {
      const result = await checkAccountContacts({ [key]: value });
      if (request !== contactRequests.current[key] || valuesRef.current[key] !== snapshot[key]) return;
      const taken = key === "username" ? result.usernameAvailable === false : key === "email" ? result.emailAvailable === false : result.phoneAvailable === false;
      setErrors((current) => ({ ...current, [key]: taken ? TAKEN[key] : undefined }));
    } catch {
      // Saving always rechecks contacts on the server, even if this early check fails.
    }
  };

  const changeField = (key: keyof CreateAccountFormValues, value: string) => {
    if (key === "username") usernameTyped.current = value.trim() !== "";
    const next = { ...values, [key]: value, ...(key === "email" && !usernameTyped.current ? { username: value.trim().toLowerCase() } : {}) };
    valuesRef.current = next;
    if (key === "username" || key === "email" || key === "phone") contactRequests.current[key]++;
    if (key === "email" && !usernameTyped.current) contactRequests.current.username++;
    setValues(next);
    setSaveError("");
    const nextErrors = validateCreateAccount(next);
    setErrors((current) => ({
      ...current,
      [key]: current[key] ? nextErrors[key] : undefined,
      ...(key === "email" && !usernameTyped.current ? { username: current.username ? nextErrors.username : undefined } : {}),
      ...(key === "password" && next.confirmPassword ? { confirmPassword: nextErrors.confirmPassword } : {}),
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // Created: leave without asking, the form is no longer "unsaved".
    if (await createAccount()) await navigation.leave(onCancel);
  };

  // From the "unsaved changes" dialog: create the account, then go where the user was heading.
  const createAndLeave = async () => {
    if (await createAccount()) await navigation.leave(onCancel);
    else navigation.cancelNavigation();
  };

  const createAccount = async (): Promise<boolean> => {
    if (saving) return false;
    const nextErrors = validateCreateAccount(values);
    setErrors(nextErrors);
    // A manager without any group could sign in to the admin area but do nothing there.
    const missingGroup = accountRole === "manager" && !roleIds.length;
    setGroupError(missingGroup ? MANAGER_NEEDS_GROUP : "");
    const firstInvalid = fields.find((field) => nextErrors[field.key]);
    if (firstInvalid) {
      document.getElementById(`create-account-${firstInvalid.key}`)?.focus();
      return false;
    }
    if (missingGroup) {
      document.getElementById("create-account-groups")?.focus();
      return false;
    }
    setSaving(true);
    setSaveError("");
    // Ignore any in-flight blur checks; the POST response is authoritative.
    contactRequests.current.username++;
    contactRequests.current.email++;
    contactRequests.current.phone++;
    try {
      return await onSave({
        name: values.name.trim(), username: values.username.trim().toLowerCase(), email: values.email.trim().toLowerCase(),
        password: values.password, confirmPassword: values.confirmPassword,
        phone: normalizeAccountPhone(values.phone), accountRole, roleIds: accountRole === "manager" ? roleIds : [],
      });
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
      return false;
    } finally { setSaving(false); }
  };

  return (
    <section aria-labelledby="create-account-title" className={`${accountFont.className} asia-access-control mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-sm sm:p-6`}>
        <UnsavedChangesDialog open={navigation.isPromptOpen} saving={saving}
          description="Bạn đang nhập dở thông tin tài khoản mới. Bạn muốn tạo tài khoản trước khi rời trang?"
          onContinue={navigation.cancelNavigation} onDiscard={() => { void navigation.leave(onCancel); }} onSave={() => { void createAndLeave(); }} />
        <h2 id="create-account-title" className="mb-6 text-xl font-bold">Thông tin tài khoản</h2>
        <form noValidate onSubmit={(event) => void submit(event)} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {saveError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{saveError}</p>}
          <EmployeeLinkPicker disabled={saving} onPick={pickEmployee} />
          {fields.map((field) => {
            const id = `create-account-${field.key}`;
            const passwordField = field.key === "password" || field.key === "confirmPassword" ? field.key : null;
            const isValid = values[field.key].trim().length > 0 && !formatErrors[field.key] && !errors[field.key];
            return (
              <div key={field.key}>
                <label htmlFor={id} className="block text-sm font-semibold">{field.label} <span aria-hidden="true" className="text-rose-600">*</span></label>
                <div className="relative mt-1.5">
                  <input
                    id={id} name={field.key} required disabled={saving}
                    type={passwordField && showPassword[passwordField] ? "text" : field.type}
                    autoComplete={field.autoComplete} maxLength={field.maxLength} placeholder={field.placeholder}
                    spellCheck={field.key === "name" ? undefined : false}
                    autoCapitalize={field.key === "email" || field.key === "username" ? "none" : undefined}
                    value={values[field.key]} onChange={(event) => changeField(field.key, event.target.value)}
                    onBlur={() => void blurField(field.key)}
                    aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `${id}-error` : undefined}
                    className={`min-h-12 w-full rounded-xl border bg-white px-3 py-2 text-base outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ${passwordField ? isValid ? "pr-20" : "pr-12" : "pr-11"} ${errors[field.key] ? "border-rose-500!" : "border-slate-200! focus:border-emerald-600!"}`}
                  />
                  {isValid && <Check aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600" />}
                  {passwordField && <button type="button" disabled={saving} onClick={() => setShowPassword((current) => ({ ...current, [passwordField]: !current[passwordField] }))} aria-label={`${showPassword[passwordField] ? "Ẩn" : "Hiện"} ${passwordField === "password" ? "mật khẩu" : "xác nhận mật khẩu"}`} aria-pressed={showPassword[passwordField]} className={`absolute top-0 flex h-full w-12 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:text-emerald-700 ${isValid ? "right-8" : "right-0"}`}>{showPassword[passwordField] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>}
                </div>
                {errors[field.key] && <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-rose-600">{errors[field.key]}</p>}
                {field.key === "email" && !errors.email && currentLink && (currentLink.employee
                  ? currentLink.employee.account
                    ? <p role="status" className="mt-1.5 text-sm text-rose-600">Nhân viên {currentLink.employee.name} ({currentLink.employee.employeeCode}) đã có tài khoản.</p>
                    : <p role="status" className="mt-1.5 text-sm text-emerald-700">Đã liên kết hồ sơ {currentLink.employee.employeeCode} · {currentLink.employee.name}</p>
                  : <p role="status" className="mt-1.5 text-sm text-amber-700">Email này chưa có trong danh bạ nhân viên. Tài khoản vẫn tạo được nhưng sẽ không hiện ảnh và chức vụ.</p>)}
                {field.key === "username" && !errors.username && <p className="mt-1.5 text-xs text-slate-500">Tự điền giống email. Sửa nếu muốn dùng tên khác; đổi lại được trong Chỉnh sửa tài khoản.</p>}
                {field.key === "password" && <p className="mt-2 text-xs leading-5 text-slate-500">{PASSWORD_REQUIREMENTS}</p>}
              </div>
            );
          })}
          {/* Managers always create user accounts, so they get no account type choice. */}
          {isRootAdmin && <div>
            <label htmlFor="create-account-role" className="block text-sm font-semibold">Loại tài khoản</label>
            <AccountFilterSelect inlineMenu id="create-account-role" label="Loại tài khoản" disabled={saving} value={accountRole} onChange={(value) => { setAccountRole(value as NewUserInput["accountRole"]); setGroupError(""); }} className="mt-1.5 w-full"
              options={[
                { value: "admin", label: "Admin gốc", icon: Crown, tone: "bg-orange-50 text-orange-600" },
                { value: "manager", label: "Quản lý", icon: UserRound, tone: "bg-blue-50 text-blue-600" },
                { value: "user", label: "Người dùng", icon: UserRound, tone: "bg-slate-100 text-slate-600" },
              ]} />
          </div>}
          {accountRole === "user" ? null
          : accountRole === "admin" ? <p className="rounded-xl bg-orange-50 p-4 text-sm text-orange-800 sm:col-span-2">Admin gốc có toàn bộ quyền hệ thống và có thể quản lý các tài khoản Admin gốc khác.</p> : <fieldset id="create-account-groups" tabIndex={-1} disabled={saving} aria-invalid={Boolean(groupError)} aria-describedby={groupError ? "create-account-groups-error" : undefined} className={`space-y-2 rounded-xl border p-3 outline-none sm:col-span-2 ${groupError ? "border-rose-500" : "border-slate-200"}`}>
            <legend className="px-1 text-sm font-semibold">Nhóm quyền <span aria-hidden="true" className="text-rose-600">*</span></legend>
            {roles.length ? roles.map((role) => <label key={role.id} className="flex cursor-pointer items-center gap-3 py-1 text-sm"><input type="checkbox" checked={roleIds.includes(role.id)} onChange={(event) => { setGroupError(""); setRoleIds((current) => event.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id)); }} className="h-5 w-5 accent-emerald-700" />{role.name}</label>) : <p className="text-sm text-slate-500">Chưa có nhóm quyền đang hoạt động. Hãy tạo nhóm quyền trước khi tạo tài khoản Quản lý.</p>}
            {groupError && <p id="create-account-groups-error" role="alert" className="text-sm text-rose-600">{groupError}</p>}
          </fieldset>}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2">
            <button type="button" disabled={saving} onClick={() => navigateWithUnsavedChangesGuard(onCancel)} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-6 text-base font-semibold text-red-600 transition-colors duration-150 enabled:hover:border-red-300! enabled:hover:bg-red-50 enabled:hover:text-red-600 enabled:active:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><X aria-hidden="true" className="h-5 w-5" />Hủy</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-semibold text-white transition-colors duration-150 enabled:hover:bg-emerald-800 enabled:active:bg-emerald-950 focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{!saving && <Plus aria-hidden="true" className="h-5 w-5" />}{saving ? "Đang lưu..." : "Tạo tài khoản"}</button>
          </footer>
        </form>
    </section>
  );
}
