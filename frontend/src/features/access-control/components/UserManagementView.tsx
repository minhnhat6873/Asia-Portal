import { useState } from "react";
import Link from "next/link";
import { Check, CirclePlus, Clock3, LockKeyhole, Pencil, Search, Trash2, UserRoundCheck, Users } from "lucide-react";
import type { Role, User } from "../types";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { PageSelect } from "@/components/ui/PageSelect";
import { PermissionGroupBadge } from "./PermissionGroupBadge";

const PAGE_SIZE = 10;

export type AccountAccess = { accountRole: "admin" | "manager"; roleIds: string[]; status: "active" | "suspended" };
interface Props {
  users: User[]; roles: Role[]; currentUserId: string; saving: boolean; canManageAccountTypes: boolean;
  onSaveUserAccess: (userId: string, access: AccountAccess) => Promise<boolean>;
  onDeleteUser: (userId: string) => Promise<boolean>;
  onRejectUser: (userId: string) => void;
  onNavigateToCreateRole: () => void;
  onViewRoleDetail: (roleId: string) => void;
}

export function UserManagementView({ users, roles, currentUserId, saving, canManageAccountTypes, onSaveUserAccess, onDeleteUser, onRejectUser, onNavigateToCreateRole, onViewRoleDetail }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [access, setAccess] = useState<AccountAccess>({ accountRole: "manager", roleIds: [], status: "active" });
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const activeRoles = roles.filter((role) => role.status === "active");
  const filtered = users.filter((user) =>
    `${user.name} ${user.email} ${user.phone}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))
    && (statusFilter === "all" || user.status === statusFilter));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startEditing = (user: User) => {
    setEditingId(user.id);
    setAccess({ accountRole: user.accountRole === "admin" ? "admin" : "manager", roleIds: user.roleIds.filter((id) => activeRoles.some((role) => role.id === id)), status: user.status === "suspended" ? "suspended" : "active" });
  };
  const save = async (userId: string) => { if (await onSaveUserAccess(userId, access)) setEditingId(null); };

  return <div className="asia-access-control space-y-5">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        { label: "Tổng tài khoản", count: users.length, Icon: Users, status: "all" },
        { label: "Đang hoạt động", count: users.filter((user) => user.status === "active").length, Icon: UserRoundCheck, status: "active" },
        { label: "Chờ duyệt", count: users.filter((user) => user.status === "pending").length, Icon: Clock3, status: "pending" },
        { label: "Tạm khóa", count: users.filter((user) => user.status === "suspended").length, Icon: LockKeyhole, status: "suspended" },
      ].map(({ label, count, Icon, status }) => <button key={label} type="button" onClick={() => { setStatusFilter(status); setPage(1); }} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm"><Icon className="h-6 w-6 shrink-0 text-emerald-700" /><span><span className="block text-sm text-slate-600">{label}</span><strong className="text-2xl text-slate-900">{count}</strong></span></button>)}
    </div>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <label className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input aria-label="Tìm tài khoản" placeholder="Tìm theo tên, email, số điện thoại..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-emerald-600" /></label>
      <Link href="/admin/access-control/accounts/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white"><CirclePlus className="h-4 w-4" />Thêm tài khoản</Link>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr>{["Tài khoản", "Số điện thoại", "Loại tài khoản", "Nhóm quyền", "Trạng thái", "Ngày tạo", "Thao tác"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!filtered.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">Không tìm thấy tài khoản.</td></tr>}
          {filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map((user) => {
            const editing = editingId === user.id;
            const protectedAccount = user.id.toLowerCase() === currentUserId.toLowerCase() || !canManageAccountTypes;
            const isAdmin = editing ? access.accountRole === "admin" : user.accountRole === "admin";
            return <tr key={user.id} className="align-top hover:bg-slate-50">
              <td className="px-4 py-3"><strong className="block text-slate-900">{user.name}</strong><span className="text-slate-500">{user.email}</span></td>
              <td className="px-4 py-3">{user.phone || "—"}</td>
              <td className="px-4 py-3">{editing ? <select aria-label={`Loại tài khoản của ${user.name}`} disabled={saving || !canManageAccountTypes} value={access.accountRole} onChange={(event) => setAccess((current) => ({ ...current, accountRole: event.target.value as AccountAccess["accountRole"] }))} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="manager">Quản lý</option><option value="admin">Admin gốc</option></select> : <PermissionGroupBadge name={isAdmin ? "Admin gốc" : "Quản lý"} color={isAdmin ? "orange" : "blue"} icon={isAdmin ? "crown" : "user"} />}</td>
              <td className="max-w-xs px-4 py-3">{isAdmin ? <span className="text-sm font-semibold text-emerald-700">Toàn quyền hệ thống</span> : editing ? <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">{activeRoles.length ? activeRoles.map((role) => <label key={role.id} className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={access.roleIds.includes(role.id)} disabled={saving} onChange={(event) => setAccess((current) => ({ ...current, roleIds: event.target.checked ? [...current.roleIds, role.id] : current.roleIds.filter((id) => id !== role.id) }))} className="h-4 w-4 accent-emerald-700" />{role.name}</label>) : <button type="button" onClick={onNavigateToCreateRole} className="underline">Tạo nhóm quyền</button>}</div> : <div className="flex flex-wrap gap-1">{user.roleIds.length ? user.roleIds.map((id) => {
                const role = roles.find((item) => item.id === id);
                return <button key={id} type="button" onClick={() => onViewRoleDetail(id)} className="rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><PermissionGroupBadge name={role?.name ?? "Nhóm quyền không còn hoạt động"} color={role?.color} icon={role?.icon} /></button>;
              }) : "Chưa gán"}</div>}</td>
              <td className="px-4 py-3">{editing ? <select aria-label={`Trạng thái của ${user.name}`} value={access.status} onChange={(event) => setAccess((current) => ({ ...current, status: event.target.value as AccountAccess["status"] }))} className="rounded-lg border border-slate-200 p-2"><option value="active">Đang hoạt động</option><option value="suspended">Tạm khóa</option></select> : <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : user.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{user.status === "active" ? "Đang hoạt động" : user.status === "pending" ? "Chờ duyệt" : "Tạm khóa"}</span>}</td>
              <td className="px-4 py-3 text-slate-500">{user.createdAt || "—"}</td>
              <td className="px-4 py-3">{!protectedAccount && <div className="flex flex-wrap gap-2">
                <button type="button" disabled={saving} onClick={() => editing ? void save(user.id) : startEditing(user)} aria-label={editing ? `Lưu ${user.name}` : `Chỉnh sửa ${user.name}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 p-2 text-emerald-700 disabled:opacity-50">{editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}{editing ? "Lưu" : user.status === "pending" ? "Duyệt & gán quyền" : "Chỉnh sửa"}</button>
                {editing && <button type="button" disabled={saving} onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-2">Hủy</button>}
                <button type="button" disabled={saving} onClick={() => setDeleteTarget(user)} aria-label={`Xóa ${user.name}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />Xóa</button>
                {!editing && user.status === "pending" && <button type="button" disabled={saving} onClick={() => { if (confirm(`Từ chối tài khoản ${user.name}?`)) onRejectUser(user.id); }} className="rounded-lg px-2 text-rose-600">Từ chối</button>}
              </div>}</td>
            </tr>;
          })}
        </tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600">
        <span>Tổng cộng {filtered.length} tài khoản</span>
        <PageSelect ariaLabel="Chọn trang tài khoản" page={safePage} pageCount={totalPages} onChange={setPage} />
      </div>
    </div>
    {deleteTarget && <DeleteAccountDialog user={deleteTarget} saving={saving} onClose={() => setDeleteTarget(null)} onConfirm={async () => {
      if (saving || deleteTarget.id.toLowerCase() === currentUserId.toLowerCase() || !canManageAccountTypes) return;
      if (await onDeleteUser(deleteTarget.id)) { setDeleteTarget(null); if (editingId === deleteTarget.id) setEditingId(null); }
    }} />}
  </div>;
}
