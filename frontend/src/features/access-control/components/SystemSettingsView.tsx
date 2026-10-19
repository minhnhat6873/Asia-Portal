"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Edit3, Layers, LockKeyhole, PlusCircle, Search, ShieldCheck, Trash2, UnlockKeyhole } from "lucide-react";
import { PageSelect } from "@/components/ui/PageSelect";
import type { Role, SystemPermission, ModuleCategory, User } from "../types";
import { PermissionGroupForm, type PermissionGroupFormData } from "./PermissionGroupForm";
import { PermissionGroupBadge } from "./PermissionGroupBadge";
import { DeletePermissionGroupDialog } from "./DeletePermissionGroupDialog";

interface Props {
  roles: Role[];
  permissions: SystemPermission[];
  modules: ModuleCategory[];
  users: User[];
  saving: boolean;
  initialActiveSubTab?: "dashboard" | "manage_roles" | "create_role";
  onCreateRole: (data: PermissionGroupFormData) => Promise<boolean>;
  onSetRoleStatus: (roleId: string, status: Role["status"]) => Promise<boolean>;
  onDeleteRole: (roleId: string) => Promise<boolean>;
  onNavigateToRoles: () => void;
  onNavigateToCreateRole: () => void;
}

function RoleStatusDialog({ role, saving, onClose, onConfirm }: { role: Role; saving: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const activating = role.status === "inactive";
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  return createPortal(
    <dialog ref={ref} aria-labelledby="role-status-title" aria-describedby="role-status-description" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-6 text-base text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm sm:p-8 sm:text-lg">
      <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full ${activating ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>{activating ? <UnlockKeyhole className="h-7 w-7" /> : <LockKeyhole className="h-7 w-7" />}</div>
      <h2 id="role-status-title" className="text-2xl font-bold">{activating ? "Kích hoạt nhóm quyền?" : "Vô hiệu hóa nhóm quyền?"}</h2>
      <p id="role-status-description" className="mt-3 break-words leading-relaxed text-slate-600">Nhóm <strong>{role.name}</strong> sẽ chuyển sang trạng thái <strong>{activating ? "Đang sử dụng" : "Đã vô hiệu hóa"}</strong>. {activating ? "Các quyền của nhóm sẽ có hiệu lực trở lại cho tài khoản được gán." : "Các quyền của nhóm sẽ tạm ngừng có hiệu lực cho tài khoản được gán."}</p>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={saving} onClick={onClose} className="min-h-12 rounded-xl border border-slate-300 px-5 py-3 font-semibold disabled:opacity-50">Hủy</button>
        <button type="button" disabled={saving} onClick={() => void onConfirm()} className={`min-h-12 rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${activating ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-600 hover:bg-rose-700"}`}>{saving ? "Đang lưu..." : activating ? "Xác nhận kích hoạt" : "Xác nhận vô hiệu hóa"}</button>
      </div>
    </dialog>, document.body,
  );
}

export function SystemSettingsView({ roles, permissions, modules, users, saving, initialActiveSubTab = "dashboard", onCreateRole, onSetRoleStatus, onDeleteRole, onNavigateToRoles, onNavigateToCreateRole }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [statusTarget, setStatusTarget] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const filtered = roles.filter((role) => `${role.name} ${role.description}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (initialActiveSubTab === "create_role") return <PermissionGroupForm permissions={permissions} modules={modules} saving={saving} onCancel={onNavigateToRoles} onSave={async (data) => { const saved = await onCreateRole(data); if (saved) onNavigateToRoles(); return saved; }} />;
  if (initialActiveSubTab === "dashboard") return <div className="asia-access-control grid gap-5 md:grid-cols-2">
    {[{ label: "Nhóm quyền đã tạo", action: onNavigateToRoles, Icon: Layers }, { label: "Tạo nhóm quyền", action: onNavigateToCreateRole, Icon: PlusCircle }].map(({ label, action, Icon }) => <button key={label} type="button" onClick={action} className="flex min-h-32 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left text-xl font-semibold shadow-sm hover:border-emerald-500"><Icon className="h-8 w-8 text-emerald-700" />{label}</button>)}
  </div>;

  return <div className="asia-access-control min-w-0 space-y-5 text-sm">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { label: "Tổng nhóm quyền", count: roles.length, Icon: Layers, tone: "bg-slate-100 text-slate-700" },
        { label: "Đang sử dụng", count: roles.filter((role) => role.status === "active").length, Icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700" },
        { label: "Đã vô hiệu hóa", count: roles.filter((role) => role.status === "inactive").length, Icon: LockKeyhole, tone: "bg-rose-50 text-rose-600" },
      ].map(({ label, count, Icon, tone }) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="h-6 w-6" /></span><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{count}</p></div></div>)}
    </div>
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="relative min-w-0 basis-full md:basis-60 md:flex-1"><Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input aria-label="Tìm nhóm quyền" placeholder="Tìm theo tên nhóm quyền, mô tả..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="min-h-12 w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 outline-none focus:border-emerald-600" /></label>
      <button type="button" onClick={onNavigateToCreateRole} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800"><PlusCircle className="h-5 w-5" />Tạo nhóm quyền</button>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[13px] font-bold uppercase text-slate-600"><tr>{["Tên nhóm quyền", "Mô tả", "Số tài khoản", "Số quyền", "Trạng thái", "Ngày tạo", "Thao tác"].map((label) => <th key={label} className="px-4 py-4 last:text-center">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">Không tìm thấy nhóm quyền phù hợp.</td></tr>}
          {rows.map((role) => <tr key={role.id} className="hover:bg-slate-50">
            <td className="px-4 py-4"><Link href={`/admin/access-control/roles/${encodeURIComponent(role.id)}/edit`} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><PermissionGroupBadge name={role.name} color={role.color} icon={role.icon} /></Link></td>
            <td className="max-w-64 px-4 py-4 text-slate-600"><p className="line-clamp-2 break-words" title={role.description}>{role.description || "—"}</p></td>
            <td className="px-4 py-4">{users.filter((user) => user.roleIds.includes(role.id)).length}</td><td className="px-4 py-4">{role.permissionIds.length}</td>
            <td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${role.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{role.status === "active" ? "Đang sử dụng" : "Đã vô hiệu hóa"}</span></td>
            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{role.createdAt ? new Date(role.createdAt).toLocaleDateString("vi-VN") : "—"}</td>
            <td className="px-4 py-4"><div className="flex justify-center gap-2">
              <Link href={`/admin/access-control/roles/${encodeURIComponent(role.id)}/edit`} title="Chỉnh sửa nhóm quyền" aria-label={`Chỉnh sửa ${role.name}`} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 text-emerald-700 hover:bg-emerald-50"><Edit3 className="h-5 w-5" /></Link>
              <button type="button" disabled={saving} onClick={() => setStatusTarget(role)} title={role.status === "active" ? "Vô hiệu hóa nhóm quyền" : "Kích hoạt nhóm quyền"} aria-label={`${role.status === "active" ? "Vô hiệu hóa" : "Kích hoạt"} ${role.name}`} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50">{role.status === "active" ? <LockKeyhole className="h-5 w-5" /> : <UnlockKeyhole className="h-5 w-5" />}</button>
              <button type="button" disabled={saving} onClick={() => setDeleteTarget(role)} title="Xóa nhóm quyền" aria-label={`Xóa nhóm quyền ${role.name}`} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 aria-hidden="true" className="h-5 w-5" /></button>
            </div></td>
          </tr>)}
        </tbody>
      </table></div>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 p-4 text-sm text-slate-600">
        <span>Hiển thị {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} trong tổng số {filtered.length} nhóm quyền</span>
        <PageSelect ariaLabel="Chọn trang nhóm quyền" page={safePage} pageCount={pageCount} onChange={setPage} />
      </footer>
    </div>
    {statusTarget && <RoleStatusDialog role={statusTarget} saving={saving} onClose={() => setStatusTarget(null)} onConfirm={async () => { if (await onSetRoleStatus(statusTarget.id, statusTarget.status === "active" ? "inactive" : "active")) setStatusTarget(null); }} />}
    {deleteTarget && <DeletePermissionGroupDialog role={deleteTarget} assignedCount={users.filter((user) => user.roleIds.includes(deleteTarget.id)).length} saving={saving} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (await onDeleteRole(deleteTarget.id)) setDeleteTarget(null); }} />}
  </div>;
}
