import { useRef, useState } from "react";
import Link from "next/link";
import { CirclePlus, LockKeyhole, Pencil, Search, Trash2, UserRoundCheck, Users } from "lucide-react";
import { formatRegistration } from "../formatRegistration";
import { AccountStatusBadge } from "./AccountStatusBadge";
import { AccountStatusDialog } from "./AccountStatusDialog";
import type { Role, User } from "../types";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { PageSelect } from "@/components/ui/PageSelect";
import { PermissionGroupBadge } from "./PermissionGroupBadge";

const PAGE_SIZE = 10;

interface Props {
  users: User[]; roles: Role[]; currentUserId: string; saving: boolean; canManageAccountTypes: boolean;
  presenceError: string;
  onRefresh: () => Promise<void>;
  onSetStatus: (id: string, status: "active" | "inactive") => Promise<boolean>;
  onDeleteUser: (userId: string) => Promise<boolean>;
  onRejectUser: (userId: string) => void;
}

export function UserManagementView({ users, roles, currentUserId, saving, canManageAccountTypes, onDeleteUser, onRejectUser, onSetStatus, onRefresh, presenceError }: Props) {
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const refreshLock = useRef(false);
  const refresh = async () => {
    if (refreshLock.current || saving) return;
    refreshLock.current = true; setRefreshing(true); setRefreshError("");
    try { await onRefresh(); } catch { setRefreshError("Không tải lại được danh sách. Vui lòng thử lại."); }
    finally { refreshLock.current = false; setRefreshing(false); }
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const filtered = users.filter((user) =>
    `${user.name} ${user.email} ${user.phone}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))
    && (statusFilter === "all" || user.status === statusFilter));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return <div className="space-y-5 text-sm leading-normal text-slate-700">
    <div><h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Quản lý tài khoản</h1><p className="mt-1 text-sm text-slate-600">Thông tin đăng ký, hoạt động và quyền truy cập tài khoản.</p></div>
    {(presenceError || refreshError) && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{presenceError || refreshError}<button type="button" disabled={refreshing || saving} onClick={() => void refresh()} className="ml-3 underline">Thử lại</button></div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[
        { label: "Tổng tài khoản", count: users.length, Icon: Users, status: "all" },
        { label: "Đang hoạt động", count: users.filter((user) => user.status === "active").length, Icon: UserRoundCheck, status: "active" },
        { label: "Đã vô hiệu hóa", count: users.filter((user) => user.status === "suspended").length, Icon: LockKeyhole, status: "suspended" },
      ].map(({ label, count, Icon, status }) => <button key={label} type="button" onClick={() => { setStatusFilter(status); setPage(1); }} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm sm:gap-3 sm:p-4"><Icon className="h-6 w-6 shrink-0 text-emerald-700" /><span><span className="block text-sm text-slate-600">{label}</span><strong className="text-2xl text-slate-900">{count}</strong></span></button>)}
    </div>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <label className="relative min-w-0 basis-full sm:basis-48 sm:flex-1"><Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input aria-label="Tìm tài khoản" placeholder="Tìm theo tên, email, số điện thoại..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-emerald-600" /></label>
      <button type="button" disabled={refreshing || saving} onClick={() => void refresh()} className="min-h-10 rounded-xl border border-slate-200 px-4 font-semibold disabled:opacity-50">{refreshing ? "Đang tải..." : "Làm mới"}</button>
      <Link href="/admin/access-control/accounts/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1a7a1a] px-4 text-sm font-semibold text-white hover:bg-[#0d5c0d]"><CirclePlus className="h-4 w-4" />Thêm tài khoản</Link>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table aria-label="Danh sách tài khoản" className="w-full min-w-[1250px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr>{["Họ tên / Email", "Số điện thoại", "Loại tài khoản", "Nhóm quyền", "Đăng nhập", "Tài khoản", "Đăng ký lúc", "Thao tác"].map((label) => <th scope="col" key={label} className="px-4 py-3 text-xs font-semibold">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!filtered.length && <tr><td colSpan={8} className="p-10 text-center text-slate-500">{users.length ? "Không có kết quả phù hợp. Hãy thử từ khóa hoặc bộ lọc khác." : "Danh sách tài khoản đang trống."}</td></tr>}
          {filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map((user) => {
            const isSelf = user.id.toLowerCase() === currentUserId.toLowerCase();
            const isAdmin = user.accountRole === "admin";
            return <tr key={user.id} className="align-top hover:bg-emerald-50/50">
              <td className="px-4 py-3"><strong className="block font-semibold text-slate-900">{user.name}</strong><span className="text-slate-500">{user.email}</span></td>
              <td className="px-4 py-3">{user.phone || "—"}</td>
              <td className="px-4 py-3"><PermissionGroupBadge name={isAdmin ? "Admin gốc" : user.accountRole === "user" ? "Chưa cấp quyền" : "Quản lý"} color={isAdmin ? "orange" : "blue"} icon={isAdmin ? "crown" : "user"} /></td>
              <td className="max-w-xs px-4 py-3">{isAdmin ? <span className="text-sm font-semibold text-emerald-700">Toàn quyền hệ thống</span> : <div className="flex flex-wrap gap-1">{user.roleIds.length ? user.roleIds.map((id) => {
                const role = roles.find((item) => item.id === id);
                return <PermissionGroupBadge key={id} name={role?.name ?? "Nhóm quyền không còn hoạt động"} color={role?.color} icon={role?.icon} />;
              }) : "Chưa gán"}</div>}</td>
              <td className="px-4 py-3"><AccountStatusBadge user={user} presence /></td>
              <td className="px-4 py-3"><AccountStatusBadge user={user} /></td>
              <td className="px-4 py-3 text-xs text-slate-500">{formatRegistration(user.createdAt)}</td>
              <td className="px-4 py-3">{canManageAccountTypes && <div className="flex flex-wrap gap-2">
                <Link href={`/admin/access-control/accounts/${encodeURIComponent(user.id)}/edit`} aria-label={`Chỉnh sửa ${user.name}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 p-2 text-emerald-700 hover:bg-emerald-50"><Pencil className="h-4 w-4" />{user.status === "pending" ? "Duyệt & gán quyền" : "Chỉnh sửa"}</Link>
                {!isSelf && user.status !== "pending" && <button type="button" disabled={saving || refreshing} onClick={() => setStatusTarget(user)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-medium text-[#1a7a1a] hover:bg-emerald-50 disabled:opacity-50">{user.status === "active" ? "Vô hiệu hóa" : "Kích hoạt lại"}</button>}
                {!isSelf && <button type="button" disabled={saving || refreshing} onClick={() => setDeleteTarget(user)} aria-label={`Xóa ${user.name}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />Xóa</button>}
                {!isSelf && user.status === "pending" && <button type="button" disabled={saving} onClick={() => { if (confirm(`Từ chối tài khoản ${user.name}?`)) onRejectUser(user.id); }} className="rounded-lg px-2 text-rose-600">Từ chối</button>}
              </div>}</td>
            </tr>;
          })}
        </tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600"><span>Tổng cộng {filtered.length} tài khoản</span><PageSelect ariaLabel="Chọn trang tài khoản" page={safePage} pageCount={totalPages} onChange={setPage} /></div>
    </div>
    <p className="text-xs text-slate-500">Trên màn hình nhỏ, vuốt ngang bảng để xem đầy đủ các cột. Online khi có hoạt động được máy chủ ghi nhận trong 3 phút gần nhất. Tự cập nhật mỗi 30 giây khi tab hiển thị.</p>
    {statusTarget && <AccountStatusDialog user={statusTarget} saving={saving} onClose={() => setStatusTarget(null)} onConfirm={async () => {
      if (saving || !canManageAccountTypes || statusTarget.id.toLowerCase() === currentUserId.toLowerCase()) return;
      if (await onSetStatus(statusTarget.id, statusTarget.status === "active" ? "inactive" : "active")) setStatusTarget(null);
    }} />}
    {deleteTarget && <DeleteAccountDialog user={deleteTarget} saving={saving} onClose={() => setDeleteTarget(null)} onConfirm={async () => {
      if (saving || deleteTarget.id.toLowerCase() === currentUserId.toLowerCase() || !canManageAccountTypes) return;
      if (await onDeleteUser(deleteTarget.id)) setDeleteTarget(null);
    }} />}
  </div>;
}
