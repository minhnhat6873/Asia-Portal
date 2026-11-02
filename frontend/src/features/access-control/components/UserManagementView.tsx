import { useState } from "react";
import Link from "next/link";
import { CirclePlus, LockKeyhole, Pencil, Search, Trash2, UserRoundCheck, Users } from "lucide-react";
import type { Role, User } from "../types";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { PageSelect } from "@/components/ui/PageSelect";
import { PermissionGroupBadge } from "./PermissionGroupBadge";

const PAGE_SIZE = 10;
interface Props {
  users: User[]; roles: Role[]; currentUserId: string; saving: boolean; canManageAccountTypes: boolean;
  onDeleteUser: (userId: string) => Promise<boolean>;
  onRejectUser: (userId: string) => void;
}

export function UserManagementView({ users, roles, currentUserId, saving, canManageAccountTypes, onDeleteUser, onRejectUser }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const filtered = users.filter((user) =>
    `${user.name} ${user.email} ${user.phone}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))
    && (statusFilter === "all" || user.status === statusFilter));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return <div className="asia-access-control space-y-5">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[
        { label: "Tổng tài khoản", count: users.length, Icon: Users, status: "all" },
        { label: "Đang hoạt động", count: users.filter((user) => user.status === "active").length, Icon: UserRoundCheck, status: "active" },
        { label: "Tạm khóa", count: users.filter((user) => user.status === "suspended").length, Icon: LockKeyhole, status: "suspended" },
      ].map(({ label, count, Icon, status }) => <button key={label} type="button" onClick={() => { setStatusFilter(status); setPage(1); }} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm sm:gap-3 sm:p-4"><Icon className="h-6 w-6 shrink-0 text-emerald-700" /><span><span className="block text-sm text-slate-600">{label}</span><strong className="text-2xl text-slate-900">{count}</strong></span></button>)}
    </div>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <label className="relative min-w-0 basis-full sm:basis-48 sm:flex-1"><Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input aria-label="Tìm tài khoản" placeholder="Tìm theo tên, email, số điện thoại..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-emerald-600" /></label>
      <Link href="/admin/access-control/accounts/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white"><CirclePlus className="h-4 w-4" />Thêm tài khoản</Link>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr>{["Tài khoản", "Số điện thoại", "Loại tài khoản", "Nhóm quyền", "Trạng thái", "Ngày tạo", "Thao tác"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!filtered.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">Không tìm thấy tài khoản.</td></tr>}
          {filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map((user) => {
            const isSelf = user.id.toLowerCase() === currentUserId.toLowerCase();
            const isAdmin = user.accountRole === "admin";
            return <tr key={user.id} className="align-top hover:bg-slate-50">
              <td className="px-4 py-3"><strong className="block text-slate-900">{user.name}</strong><span className="text-slate-500">{user.email}</span></td>
              <td className="px-4 py-3">{user.phone || "—"}</td>
              <td className="px-4 py-3"><PermissionGroupBadge name={isAdmin ? "Admin gốc" : user.accountRole === "user" ? "Chưa cấp quyền" : "Quản lý"} color={isAdmin ? "orange" : "blue"} icon={isAdmin ? "crown" : "user"} /></td>
              <td className="max-w-xs px-4 py-3">{isAdmin ? <span className="text-sm font-semibold text-emerald-700">Toàn quyền hệ thống</span> : <div className="flex flex-wrap gap-1">{user.roleIds.length ? user.roleIds.map((id) => {
                const role = roles.find((item) => item.id === id);
                return <PermissionGroupBadge key={id} name={role?.name ?? "Nhóm quyền không còn hoạt động"} color={role?.color} icon={role?.icon} />;
              }) : "Chưa gán"}</div>}</td>
              <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : user.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{user.status === "active" ? "Đang hoạt động" : user.status === "pending" ? "Chờ duyệt" : "Tạm khóa"}</span></td>
              <td className="px-4 py-3 text-slate-500">{user.createdAt || "—"}</td>
              <td className="px-4 py-3">{canManageAccountTypes && <div className="flex flex-wrap gap-2">
                <Link href={`/admin/access-control/accounts/${encodeURIComponent(user.id)}/edit`} aria-label={`Chỉnh sửa ${user.name}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 p-2 text-emerald-700 hover:bg-emerald-50"><Pencil className="h-4 w-4" />{user.status === "pending" ? "Duyệt & gán quyền" : "Chỉnh sửa"}</Link>
                {!isSelf && <button type="button" disabled={saving} onClick={() => setDeleteTarget(user)} aria-label={`Xóa ${user.name}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />Xóa</button>}
                {!isSelf && user.status === "pending" && <button type="button" disabled={saving} onClick={() => { if (confirm(`Từ chối tài khoản ${user.name}?`)) onRejectUser(user.id); }} className="rounded-lg px-2 text-rose-600">Từ chối</button>}
              </div>}</td>
            </tr>;
          })}
        </tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600"><span>Tổng cộng {filtered.length} tài khoản</span><PageSelect ariaLabel="Chọn trang tài khoản" page={safePage} pageCount={totalPages} onChange={setPage} /></div>
    </div>
    {deleteTarget && <DeleteAccountDialog user={deleteTarget} saving={saving} onClose={() => setDeleteTarget(null)} onConfirm={async () => {
      if (saving || deleteTarget.id.toLowerCase() === currentUserId.toLowerCase() || !canManageAccountTypes) return;
      if (await onDeleteUser(deleteTarget.id)) setDeleteTarget(null);
    }} />}
  </div>;
}
