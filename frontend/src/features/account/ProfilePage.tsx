"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Info, RotateCcw } from "lucide-react";
import { userAuthService, type UserProfile } from "@/services/user-auth.service";
import UserAvatar from "@/components/ui/UserAvatar";
import AvatarCropDialog from "@/components/ui/AvatarCropDialog";
import { showToast } from "@/features/admin/auth/notify";
import { getEmployeeDepartmentLabel } from "@/components/ui/employee-department-options";
import AccountShell, { Card } from "./AccountShell";

function formatDay(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-semibold text-slate-800">{value || "—"}</dd>
    </div>
  );
}

/** Read-only: the account comes from IT, the employee record from HR. */
export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    userAuthService.getProfile(controller.signal)
      .then(setProfile)
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được thông tin."); });
    return () => controller.abort();
  }, []);

  const employee = profile?.employee;
  const name = employee?.name || profile?.account.name || "";
  const fileInput = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState<{ source: string; fileName: string } | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  useEffect(() => () => { if (crop) URL.revokeObjectURL(crop.source); }, [crop]);

  const applyAvatar = (avatar: string, customAvatar: boolean) => {
    setProfile((current) => current ? { ...current, account: { ...current.account, avatar, customAvatar } } : current);
    // The header and menu read the session; refresh it so they show the new picture.
    window.dispatchEvent(new Event("asia-user-session-changed"));
  };

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { showToast("Ảnh không hợp lệ", "Chỉ nhận ảnh JPG, PNG hoặc WEBP.", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Ảnh quá lớn", "Ảnh tối đa 5MB.", "error"); return; }
    setCrop({ source: URL.createObjectURL(file), fileName: file.name });
  };

  const uploadCropped = async (file: File) => {
    setCrop(null);
    setSavingAvatar(true);
    try {
      const result = await userAuthService.uploadAvatar(file);
      applyAvatar(result.avatar, result.customAvatar);
      showToast("Đã cập nhật ảnh đại diện", "Ảnh mới chỉ dùng cho tài khoản của bạn, hồ sơ nhân sự không thay đổi.", "success");
    } catch (reason) {
      showToast("Không đổi được ảnh đại diện", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
    } finally { setSavingAvatar(false); }
  };

  const removeOwnAvatar = async () => {
    setSavingAvatar(true);
    try {
      const result = await userAuthService.removeAvatar();
      applyAvatar(result.avatar, result.customAvatar);
      showToast("Đã bỏ ảnh riêng", employee?.avatar ? "Tài khoản dùng lại ảnh trong hồ sơ nhân sự." : "Tài khoản hiển thị chữ viết tắt.", "success");
    } catch (reason) {
      showToast("Không cập nhật được ảnh đại diện", reason instanceof Error ? reason.message : "Vui lòng thử lại.", "error");
    } finally { setSavingAvatar(false); }
  };

  return (
    <AccountShell title="Thông tin cá nhân" description="Thông tin tài khoản của bạn.">
      {error ? (
        <Card><p role="alert" className="text-sm text-rose-600">{error}</p></Card>
      ) : !profile ? (
        <Card><p role="status" className="text-sm text-slate-500">Đang tải thông tin…</p></Card>
      ) : (
        <div className="space-y-5">
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <UserAvatar src={profile.account.avatar} name={name} className="h-20 w-20 bg-[#0b851d] text-2xl font-bold text-white ring-4 ring-emerald-50" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold text-slate-900">{name}</p>
              <p className="truncate text-sm text-slate-500">{employee?.position || "Nhân viên"}{employee?.department ? ` · ${getEmployeeDepartmentLabel(employee.department)}` : ""}</p>
              <p className="mt-1 text-xs text-slate-400">{profile.account.customAvatar ? "Đang dùng ảnh riêng của tài khoản." : employee?.avatar ? "Đang dùng ảnh trong hồ sơ nhân sự." : "Chưa có ảnh đại diện."}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickFile} />
              <button type="button" disabled={savingAvatar} onClick={() => fileInput.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
                <Camera aria-hidden="true" size={16} />{savingAvatar ? "Đang lưu…" : "Đổi ảnh đại diện"}
              </button>
              {profile.account.customAvatar && (
                <button type="button" disabled={savingAvatar} onClick={() => void removeOwnAvatar()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                  <RotateCcw aria-hidden="true" size={15} />{employee?.avatar ? "Dùng ảnh hồ sơ nhân sự" : "Bỏ ảnh riêng"}
                </button>
              )}
            </div>
          </Card>
          {crop && <AvatarCropDialog shape="round" source={crop.source} fileName={crop.fileName} onCancel={() => setCrop(null)} onApply={(file) => void uploadCropped(file)} />}

          <Card>
            <h2 className="text-base font-bold text-slate-900">Tài khoản</h2>
            <dl className="mt-2">
              <Row label="Họ và tên" value={profile.account.name} />
              <Row label="Email đăng nhập" value={profile.account.email} />
              <Row label="Số điện thoại" value={profile.account.phone} />
              <Row label="Ngày tạo tài khoản" value={formatDay(profile.account.createdAt)} />
            </dl>
          </Card>

          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
            <Info aria-hidden="true" size={15} className="mt-0.5 shrink-0" />
            Ảnh đại diện bạn đổi chỉ dùng cho tài khoản này, không thay đổi ảnh trong danh bạ nhân viên. Các thông tin khác chỉ để xem; nếu có sai sót, vui lòng liên hệ phòng Nhân sự hoặc bộ phận IT.
          </p>
        </div>
      )}
    </AccountShell>
  );
}
