"use client";

import { useRef, useState, type FocusEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, LockKeyhole, LockKeyholeOpen, ShieldCheck, UserRound } from "lucide-react";
import type { Role, User } from "../types";
import { checkAccountContacts, resetAccountPassword, updateAccount } from "@/services/access-control.service";
import { ApiError } from "@/services/api";
import { PASSWORD_MAX_LENGTH, PASSWORD_REQUIREMENTS } from "@/lib/password-validation";
import { MANAGER_NEEDS_GROUP, normalizeAccountPhone, validateAccountIdentity, validateAccountPassword, validateUsername, type CreateAccountFormErrors } from "../create-account.validation";
import { deriveInitials } from "@/lib/adminSession";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";
import { navigateWithUnsavedChangesGuard } from "@/lib/unsavedChangesNavigation";
import UnsavedChangesDialog from "@/components/ui/UnsavedChangesDialog";
import { AccountActionDialog } from "./AccountActionDialog";
import { describeLock, isEmployeeLock } from "../account-lock";

type Tab = "info" | "permissions" | "password";
const INPUT = "mt-1.5 min-h-11 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-500";
const PRIMARY = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50";

function focusesAction(event: FocusEvent<HTMLInputElement>): boolean {
  // Action handlers validate on save. Avoid moving the clicked button by
  // inserting a blur error between pointer down and pointer up.
  return event.relatedTarget instanceof Element && Boolean(event.relatedTarget.closest("button, a"));
}

function initialProfile(user: User) {
  return { name: user.name, username: user.username, email: user.email, phone: user.phone, role: user.accountRole,
    status: user.status === "suspended" ? "inactive" : user.status === "pending" ? "pending" : "active",
    permissionGroupIds: [...user.roleIds] };
}

function profileSignature(profile: ReturnType<typeof initialProfile>): string {
  return JSON.stringify({ ...profile, permissionGroupIds: [...profile.permissionGroupIds].sort() });
}

export function EditAccountPage({ user, roles, isRootAdmin, currentUserId, onBack, onSaved }: {
  user: User; roles: Role[]; isRootAdmin: boolean; currentUserId: string; onBack: () => void; onSaved: () => Promise<void>;
}) {
  const isSelf = currentUserId.toLowerCase() === user.id.toLowerCase();
  const [baseline, setBaseline] = useState(() => initialProfile(user));
  const [profile, setProfile] = useState(baseline);
  const [tab, setTab] = useState<Tab>("info");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState({ password: false, confirmation: false });
  const [notifyUser, setNotifyUser] = useState(false);
  const [notifyBaseline, setNotifyBaseline] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<CreateAccountFormErrors>({});
  const profileRef = useRef(profile);
  const contactRequests = useRef({ username: 0, email: 0, phone: 0 });
  const profileDirty = profileSignature(profile) !== profileSignature(baseline);
  const passwordDirty = Boolean(password || confirmation) || notifyUser !== notifyBaseline;
  const hasChanges = profileDirty || passwordDirty;
  const navigation = useUnsavedChanges(hasChanges, saving);
  const activeRoles = roles.filter((role) => role.status === "active");
  const profileErrors = (values = profile): CreateAccountFormErrors => {
    const next = validateAccountIdentity(values);
    if (isSelf || values.email.trim().toLowerCase() === baseline.email.trim().toLowerCase()) delete next.email;
    if (normalizeAccountPhone(values.phone) === normalizeAccountPhone(baseline.phone)) delete next.phone;
    const usernameError = values.username.trim().toLowerCase() === baseline.username ? "" : validateUsername(values.username);
    if (usernameError) next.username = usernameError;
    return next;
  };
  const fieldClass = (field: keyof CreateAccountFormErrors) => `${INPUT} ${errors[field] ? "border-rose-500 focus:border-rose-500" : "border-slate-200 focus:border-emerald-600"}`;
  const fieldError = (field: keyof CreateAccountFormErrors) => errors[field] ? <p id={`edit-account-${field}-error`} role="alert" className="mt-1.5 text-sm text-rose-600">{errors[field]}</p> : null;
  const showErrors = (next: CreateAccountFormErrors) => {
    setErrors((current) => ({ ...current, ...next }));
    const first = (Object.keys(next) as (keyof CreateAccountFormErrors)[]).find((field) => next[field]);
    if (first) {
      setTab(first === "password" || first === "confirmPassword" ? "password" : "info");
      requestAnimationFrame(() => document.getElementById(`edit-account-${first}`)?.focus());
    }
  };
  const handleFailure = (cause: unknown, fallback: string) => {
    if (cause instanceof ApiError) {
      const next: CreateAccountFormErrors = {};
      for (const key of ["name", "username", "email", "phone", "password", "confirmPassword"] as const) {
        if (cause.fieldErrors[key]) next[key] = cause.fieldErrors[key];
      }
      if (Object.keys(next).length) { showErrors(next); return; }
      setError(cause.errors[0] ?? cause.message); return;
    }
    setError(cause instanceof Error ? cause.message : fallback);
  };
  const changeProfile = <K extends keyof typeof profile>(key: K, value: typeof profile[K]) => {
    const next = { ...profile, [key]: value };
    profileRef.current = next;
    if (key === "username" || key === "email" || key === "phone") contactRequests.current[key as "username" | "email" | "phone"]++;
    setProfile(next); setError(""); setMessage("");
    if (key === "name" || key === "username" || key === "email" || key === "phone") {
      const field = key as "name" | "username" | "email" | "phone";
      setErrors((current) => ({ ...current, [field]: current[field] ? profileErrors(next)[field] : undefined }));
    }
  };
  const blurField = async (field: "name" | "username" | "email" | "phone", event: FocusEvent<HTMLInputElement>) => {
    if (focusesAction(event)) return;
    const snapshot = profileRef.current;
    const localError = profileErrors(snapshot)[field];
    setErrors((current) => ({ ...current, [field]: localError }));
    if (localError || field === "name" || savingRef.current) return;
    const value = field === "phone" ? normalizeAccountPhone(snapshot.phone) : snapshot[field].trim().toLowerCase();
    const original = field === "phone" ? normalizeAccountPhone(baseline.phone) : baseline[field].trim().toLowerCase();
    if (value === original || (field === "email" && isSelf)) return;
    const sequence = ++contactRequests.current[field];
    try {
      const result = await checkAccountContacts({ [field]: value });
      if (sequence !== contactRequests.current[field] || profileRef.current[field] !== snapshot[field]) return;
      const taken = field === "username" ? result.usernameAvailable === false : field === "email" ? result.emailAvailable === false : result.phoneAvailable === false;
      const takenText = { username: "Tên đăng nhập đã được sử dụng.", email: "Email đã được sử dụng.", phone: "Số điện thoại đã được sử dụng." }[field];
      setErrors((current) => ({ ...current, [field]: taken ? takenText : undefined }));
    } catch { /* The save API always rechecks uniqueness. */ }
  };
  const changePassword = (field: "password" | "confirmPassword", value: string) => {
    if (field === "password") setPassword(value); else setConfirmation(value);
    const next = validateAccountPassword(field === "password" ? value : password, field === "confirmPassword" ? value : confirmation);
    setErrors((current) => ({ ...current, [field]: current[field] ? next[field] : undefined, ...(field === "password" && confirmation ? { confirmPassword: next.confirmPassword } : {}) }));
    setError(""); setMessage("");
  };

  // Locked because the employee left or the record was removed, and now being set back to active.
  const unlockingEmployeeLock = isEmployeeLock(user.lock) && baseline.status === "inactive" && profile.status !== "inactive";
  const [confirmUnlock, setConfirmUnlock] = useState<(() => void) | null>(null);

  const saveProfile = async (): Promise<boolean> => {
    if (savingRef.current) return false;
    const nextErrors = profileErrors();
    if (Object.keys(nextErrors).length) { showErrors(nextErrors); return false; }
    // Becoming a manager, or removing a manager's last group, needs at least one group
    // (same rule as the backend; older managers without groups can still be edited).
    if (isRootAdmin && profile.role === "manager" && !profile.permissionGroupIds.length
      && (baseline.role !== "manager" || baseline.permissionGroupIds.length > 0)) {
      setTab("permissions"); setMessage(""); setError(MANAGER_NEEDS_GROUP); return false;
    }
    const changedEmail = profile.email.trim().toLowerCase() !== baseline.email.trim().toLowerCase();
    contactRequests.current.username++; contactRequests.current.email++; contactRequests.current.phone++;
    const changedUsername = profile.username.trim().toLowerCase() !== baseline.username;
    savingRef.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const saved = await updateAccount(user.id, {
        name: profile.name.trim(),
        ...(changedUsername ? { username: profile.username.trim().toLowerCase() } : {}),
        ...(changedEmail && !isSelf ? { email: profile.email.trim().toLowerCase() } : {}),
        ...(normalizeAccountPhone(profile.phone) !== normalizeAccountPhone(baseline.phone) ? { phone: normalizeAccountPhone(profile.phone) } : {}),
        // Only Admin gốc changes the account type or permission groups; only managers carry groups.
        ...(!isSelf ? { status: profile.status as "pending" | "active" | "inactive",
          ...(isRootAdmin ? { role: profile.role, permissionGroupIds: profile.role === "manager" ? profile.permissionGroupIds : [] } : {}) } : {}),
      });
      const savedProfile = { name: saved.name, username: saved.username, email: saved.email, phone: saved.phone ?? "", role: saved.role, status: saved.status, permissionGroupIds: [...saved.permissionGroupIds] };
      profileRef.current = savedProfile;
      setProfile(savedProfile); setBaseline(savedProfile); setErrors({});
      await onSaved();
      if (isSelf) window.dispatchEvent(new Event("focus"));
      return true;
    } catch (cause) { handleFailure(cause, "Không thể lưu tài khoản."); return false; }
    finally { savingRef.current = false; setSaving(false); }
  };

  const savePassword = async (): Promise<boolean> => {
    if (savingRef.current || isSelf) return false;
    const nextErrors = validateAccountPassword(password, confirmation);
    if (Object.keys(nextErrors).length) { showErrors(nextErrors); return false; }
    savingRef.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const result = await resetAccountPassword(user.id, { password, confirmPassword: confirmation, notifyUser });
      setPassword(""); setConfirmation("");
      setNotifyBaseline(notifyUser); setErrors({});
      setMessage(notifyUser && !result.notificationSent ? "Đã đặt lại mật khẩu, nhưng chưa gửi được email thông báo. Vui lòng liên hệ người dùng trực tiếp." : "Đã đặt lại mật khẩu thành công." );
      return true;
    } catch (cause) { handleFailure(cause, "Không thể đặt lại mật khẩu."); return false; }
    finally { savingRef.current = false; setSaving(false); }
  };

  // Saving the form clicked from the footer; unlocking an account that was locked because the
  // employee left or was removed asks for confirmation first, like the list's "Mở khóa" button.
  const requestSaveProfile = () => {
    const save = () => { void saveProfile().then((saved) => { if (saved) setMessage("Đã lưu thay đổi tài khoản."); }); };
    if (unlockingEmployeeLock) setConfirmUnlock(() => save); else save();
  };

  const saveAndLeave = async () => {
    const nextErrors = { ...(profileDirty ? profileErrors() : {}), ...(passwordDirty ? validateAccountPassword(password, confirmation) : {}) };
    if (Object.keys(nextErrors).length) { showErrors(nextErrors); navigation.cancelNavigation(); return; }
    // Same confirmation when saving from the "unsaved changes" dialog: stay on the page and ask.
    if (unlockingEmployeeLock) { navigation.cancelNavigation(); setTab("info"); requestSaveProfile(); return; }
    // Save both kinds of changes before leaving, even if another tab is selected.
    if (profileDirty && !(await saveProfile())) { navigation.cancelNavigation(); return; }
    if (passwordDirty && !(await savePassword())) { setTab("password"); navigation.cancelNavigation(); return; }
    await navigation.leave(onBack);
  };

  return <div className="mx-auto max-w-4xl space-y-5 pb-8">
    <UnsavedChangesDialog open={navigation.isPromptOpen} saving={saving} description="Bạn muốn lưu thay đổi trước khi rời trang chỉnh sửa tài khoản?"
      onContinue={navigation.cancelNavigation} onDiscard={() => { void navigation.leave(onBack); }} onSave={() => { void saveAndLeave(); }} />
    {confirmUnlock && <AccountActionDialog title="Mở khóa tài khoản?" Icon={LockKeyholeOpen} tone="amber" confirmLabel="Mở khóa và lưu" busyLabel="Đang lưu..." saving={saving}
      onClose={() => setConfirmUnlock(null)}
      onConfirm={() => { const save = confirmUnlock; setConfirmUnlock(null); save(); }}>
      <p>Tài khoản <strong>{user.name}</strong> ({user.email}) sẽ đăng nhập lại được.</p>
      <p className="text-sm text-slate-500">Lý do đang khóa: {describeLock(user.lock)}</p>
      <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Nhân viên này đã nghỉ việc hoặc hồ sơ đã bị xóa. Bạn chắc chắn muốn mở khóa?</p>
    </AccountActionDialog>}
    <div className="flex items-start gap-3">
      <button type="button" onClick={() => navigateWithUnsavedChangesGuard(onBack)} aria-label="Quay lại quản lý tài khoản" className="rounded-xl p-2 text-slate-600 hover:bg-emerald-50"><ArrowLeft size={21} /></button>
      <div><h1 className="text-xl font-extrabold text-slate-900">Chỉnh sửa tài khoản</h1><p className="mt-1 text-sm text-slate-500">Cập nhật thông tin và phân quyền cho tài khoản quản lý.</p></div>
    </div>
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-orange-50 text-xl font-bold text-orange-600">{deriveInitials(user.name)}</div>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-slate-900">{user.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{user.status === "active" ? "Đang hoạt động" : user.status === "pending" ? "Chờ duyệt" : "Tạm khóa"}</span></div><p className="mt-1 break-all text-sm text-slate-500">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p><p className="mt-1 text-xs text-slate-400">Ngày tạo: {user.createdAt || "—"} · Cập nhật lần cuối: {user.updatedAt || "—"}</p></div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div role="tablist" aria-label="Chỉnh sửa tài khoản" className="flex border-b border-slate-200 bg-slate-50/60">
        {([{ id: "info", label: "Thông tin tài khoản", Icon: UserRound }, { id: "permissions", label: "Phân quyền", Icon: ShieldCheck }, { id: "password", label: "Mật khẩu", Icon: LockKeyhole }] as const)
          // Permission groups apply to managers only, and only Admin gốc assigns them.
          .filter(({ id }) => id !== "permissions" || (isRootAdmin && profile.role === "manager")).map(({ id, label, Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} aria-controls={`account-panel-${id}`} id={`account-tab-${id}`} onClick={() => { setTab(id); setError(""); setMessage(""); }} className={`flex min-h-14 flex-1 items-center justify-center gap-2 border-b-2 px-2 text-xs font-semibold sm:px-4 sm:text-sm ${tab === id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:bg-slate-100"}`}><Icon size={18} className="shrink-0" />{label}</button>)}
      </div>
      <div role="tabpanel" id={`account-panel-${tab}`} aria-labelledby={`account-tab-${tab}`} className="space-y-5 p-4 sm:p-6">
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        <fieldset disabled={saving} className="min-w-0 space-y-5 disabled:opacity-70">
          {tab === "info" && <div className="grid gap-5 sm:grid-cols-2">
            <div><label htmlFor="edit-account-name" className="text-sm font-semibold text-slate-700">Họ và tên *</label><input id="edit-account-name" maxLength={100} value={profile.name} onChange={(e) => changeProfile("name", e.target.value)} onBlur={(event) => void blurField("name", event)} className={fieldClass("name")} autoComplete="off" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "edit-account-name-error" : undefined} />{fieldError("name")}</div>
            <div><label htmlFor="edit-account-username" className="text-sm font-semibold text-slate-700">Tên đăng nhập *</label><input id="edit-account-username" maxLength={100} value={profile.username} onChange={(e) => changeProfile("username", e.target.value)} onBlur={(event) => void blurField("username", event)} className={fieldClass("username")} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? "edit-account-username-error" : "edit-account-username-help"} />{fieldError("username")}<p id="edit-account-username-help" className="mt-1.5 text-xs text-slate-500">Mặc định là email. Nếu có người cố dò mật khẩu tài khoản này, đổi sang tên khác rồi báo cho người dùng. Email vẫn giữ nguyên để dùng khi quên mật khẩu.</p></div>
            <div><label htmlFor="edit-account-email" className="text-sm font-semibold text-slate-700">Email *</label><input id="edit-account-email" type="email" maxLength={150} disabled={isSelf} value={profile.email} onChange={(e) => changeProfile("email", e.target.value)} onBlur={(event) => void blurField("email", event)} className={fieldClass("email")} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "edit-account-email-error" : undefined} />{fieldError("email")}{isSelf && <p className="mt-2 text-xs text-slate-500">Đổi email của chính bạn cần xác nhận OTP. <Link href="/admin/account/change-email" className="font-semibold text-emerald-700 underline">Đổi email của tôi</Link></p>}</div>
            <label className="text-sm font-semibold text-slate-700">Trạng thái tài khoản<select aria-label="Trạng thái tài khoản" disabled={isSelf} value={profile.status} onChange={(e) => changeProfile("status", e.target.value)} className={`${INPUT} border-slate-200 focus:border-emerald-600`}><option value="active">Đang hoạt động</option><option value="inactive">Tạm khóa</option><option value="pending">Chờ duyệt</option></select>{unlockingEmployeeLock && <span role="alert" className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-normal text-amber-800">Nhân viên này đã nghỉ việc hoặc hồ sơ đã bị xóa. Lưu sẽ mở khóa tài khoản.</span>}</label>
            <div><label htmlFor="edit-account-phone" className="text-sm font-semibold text-slate-700">Số điện thoại</label><input id="edit-account-phone" type="tel" maxLength={30} value={profile.phone} onChange={(e) => changeProfile("phone", e.target.value)} onBlur={(event) => void blurField("phone", event)} className={fieldClass("phone")} autoComplete="off" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "edit-account-phone-error" : undefined} />{fieldError("phone")}</div>
            {/* Managers only manage user accounts, so the type is not shown as a choice. */}
            {isRootAdmin && <label className="text-sm font-semibold text-slate-700">Loại tài khoản<select aria-label="Loại tài khoản" disabled={isSelf} value={profile.role} onChange={(e) => changeProfile("role", e.target.value as User["accountRole"])} className={`${INPUT} border-slate-200 focus:border-emerald-600`}><option value="user">Người dùng</option><option value="manager">Quản lý</option><option value="admin">Admin gốc</option></select></label>}
          </div>}
          {tab === "permissions" && <div className="space-y-4"><h3 className="text-base font-bold text-slate-900">Nhóm quyền</h3>{profile.role !== "manager" || !isRootAdmin ? <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">{profile.role === "admin" ? "Admin gốc có toàn quyền hệ thống, không cần gán nhóm quyền." : "Chỉ tài khoản Quản lý mới được gán nhóm quyền."}</p> : <div className="space-y-3">{roles.filter((role) => role.status === "active" || profile.permissionGroupIds.includes(role.id)).map((role) => <label key={role.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={profile.permissionGroupIds.includes(role.id)} onChange={(e) => changeProfile("permissionGroupIds", e.target.checked ? [...profile.permissionGroupIds, role.id] : profile.permissionGroupIds.filter((id) => id !== role.id))} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-700" /><span><strong className="text-sm text-slate-800">{role.name}{role.status === "inactive" ? " (đã vô hiệu hóa)" : ""}</strong><span className="mt-1 block text-xs text-slate-500">{role.description || `${role.permissionIds.length} quyền`}</span></span></label>)}{!activeRoles.length && <p className="text-sm text-slate-500">Chưa có nhóm quyền đang hoạt động. <Link href="/admin/access-control/roles/new" className="font-semibold text-emerald-700 underline">Tạo nhóm quyền</Link></p>}{profile.permissionGroupIds.some((id) => !activeRoles.some((role) => role.id === id)) && <p className="text-sm text-amber-700">Tài khoản có nhóm quyền đã vô hiệu hóa. Bỏ chọn nhóm cũ trước khi lưu hoặc kích hoạt lại nhóm.</p>}</div>}</div>}
          {tab === "password" && (isSelf ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-900">Để đổi mật khẩu của chính mình, bạn cần nhập mật khẩu hiện tại và xác nhận OTP.<Link href="/admin/account?tab=password" className="mt-3 block font-bold underline">Đổi mật khẩu của tôi</Link></div> : <div className="space-y-5">
            <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><LockKeyhole size={25} className="shrink-0 text-emerald-700" /><div><h3 className="text-sm font-bold text-slate-900">Đặt lại mật khẩu</h3><p className="mt-1 text-xs leading-5 text-slate-500">Không thể xem mật khẩu hiện tại. Bạn có thể đặt mật khẩu mới cho tài khoản này.</p></div></div>
            {([{ id: "password", field: "password", label: "Mật khẩu mới", value: password }, { id: "confirmation", field: "confirmPassword", label: "Xác nhận mật khẩu mới", value: confirmation }] as const).map(({ id, field, label, value }) => <div key={id}><label htmlFor={`edit-account-${field}`} className="block text-sm font-semibold text-slate-700">{label} *</label><div className="relative"><input id={`edit-account-${field}`} type={visible[id] ? "text" : "password"} value={value} onChange={(e) => changePassword(field, e.target.value)} onBlur={(event) => { if (!focusesAction(event)) setErrors((current) => ({ ...current, [field]: validateAccountPassword(password, confirmation)[field] })); }} maxLength={PASSWORD_MAX_LENGTH} autoComplete="new-password" className={`${fieldClass(field)} pr-12`} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `edit-account-${field}-error` : undefined} /><button type="button" aria-label={`${visible[id] ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`} aria-pressed={visible[id]} onClick={() => setVisible((current) => ({ ...current, [id]: !current[id] }))} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500">{visible[id] ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{fieldError(field)}</div>)}
            <p className="text-xs text-slate-500">{PASSWORD_REQUIREMENTS} Xác nhận mật khẩu phải trùng khớp.</p>
            <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={notifyUser} onChange={(e) => setNotifyUser(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span>Gửi email thông báo cho người dùng<span className="mt-1 block text-xs text-slate-500">Thông báo việc đặt lại mật khẩu; không gửi mật khẩu qua email.</span></span></label>
          </div>)}
        </fieldset>
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-4 sm:px-6"><button type="button" disabled={saving} onClick={() => navigateWithUnsavedChangesGuard(onBack)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600">Hủy</button>{tab === "password" ? !isSelf && <button type="button" disabled={saving} onClick={() => { void savePassword(); }} className={PRIMARY}><KeyRound size={18} />{saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</button> : <button type="button" disabled={saving} onClick={requestSaveProfile} className={PRIMARY}><Check size={18} />{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>}</div>
    </div>
  </div>;
}
