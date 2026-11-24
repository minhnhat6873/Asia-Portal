import UserAvatar from "@/components/ui/UserAvatar";
import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, CircleCheck, CircleMinus, CirclePlus, CircleX, Clock3, Crown, Funnel, Info, LockKeyhole, LockKeyholeOpen, Pencil, Search, Trash2, UserRound, UserRoundCheck, Users } from "lucide-react";
import { Button, Dialog, DialogTrigger, Heading, OverlayArrow, Popover } from "react-aria-components";
import type { Role, User } from "../types";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { AccountActionDialog } from "./AccountActionDialog";
import { describeLock, isEmployeeLock } from "../account-lock";
import { PageSelect } from "@/components/ui/PageSelect";
import { AccountFilterSelect } from "./AccountFilterSelect";
import { PermissionGroupBadge } from "./PermissionGroupBadge";
import { accountFont } from "../account-font";

const PAGE_SIZE = 10;
interface Props {
  users: User[]; roles: Role[]; currentUserId: string; saving: boolean; canManageAccountTypes: boolean; isRootAdmin: boolean;
  canUseTrash: boolean;
  onDeleteUser: (userId: string) => Promise<boolean>;
  onRejectUser: (userId: string) => void;
  onLockUser: (userId: string, reason: string) => Promise<boolean>;
  onUnlockUser: (userId: string) => Promise<boolean>;
}

const LOCK_REASON_MAX = 200;
const ACCOUNT_COLUMNS = ["Tài khoản", "Số điện thoại", "Loại tài khoản", "Nhóm quyền", "Trạng thái", "Ngày tạo", "Thao tác"];
const ACTION_BUTTON = "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const accountDialogClass = `${accountFont.className} [&_button]:text-[14px] [&_button]:font-semibold`;

export const ACCOUNT_ROLE_LABELS: Record<User["accountRole"], string> = { admin: "Admin gốc", manager: "Quản lý", user: "Người dùng" };
const STATUS_LABELS: Record<string, string> = { active: "Đang hoạt động", pending: "Chờ duyệt", suspended: "Tạm khóa" };
const lockDateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
});
const lockTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit", minute: "2-digit",
  hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh",
});

function LockedAccountStatus({ lock, name }: Pick<User, "lock" | "name">) {
  const reason = describeLock(lock) || "Chưa có thông tin";
  const timestamp = lock ? Date.parse(lock.at) : NaN;
  const lockTime = Number.isFinite(timestamp)
    ? `${lockDateFormat.format(timestamp)} ${lockTimeFormat.format(timestamp)}`
    : "Chưa có thông tin";

  return <div className="inline-flex max-w-60 flex-col gap-0.5 rounded-xl bg-rose-50 px-2.5 py-1.5">
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-rose-700">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS.suspended}
    </span>
    <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-normal text-slate-600">
      <span className="truncate">Lý do: {reason}</span>
      <DialogTrigger>
        <Button aria-label={`Xem lý do khóa tài khoản ${name}`} className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-rose-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600">
          <Info aria-hidden="true" className="size-4" />
        </Button>
        <Popover placement="bottom" offset={10} className="group z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg">
          <OverlayArrow className="pointer-events-none">
            <span className="block size-2.5 translate-y-1/2 rotate-45 border-l border-t border-slate-200 bg-white group-data-[placement=top]:-translate-y-1/2 group-data-[placement=top]:rotate-[225deg]" />
          </OverlayArrow>
          <Dialog className={`${accountFont.className} relative space-y-3 rounded-xl bg-white p-4 text-[14px] font-normal text-slate-600 outline-none`}>
            <div className="flex items-start gap-2.5">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-700" />
              <div className="min-w-0">
                <Heading slot="title" className="text-[16px] font-semibold text-slate-900">Lý do khóa</Heading>
                <p className="mt-1 [overflow-wrap:anywhere]">{reason}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>Thời gian khóa: {lockTime}</span>
            </div>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  </div>;
}

export function UserManagementView({ users, roles, currentUserId, saving, canManageAccountTypes, isRootAdmin, canUseTrash, onDeleteUser, onRejectUser, onLockUser, onUnlockUser }: Props) {
  const [lockTarget, setLockTarget] = useState<User | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [unlockTarget, setUnlockTarget] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const filtered = users.filter((user) =>
    `${user.name} ${user.email} ${user.phone}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))
    && (statusFilter === "all" || user.status === statusFilter)
    && (roleFilter === "all" || user.accountRole === roleFilter));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return <div className={`${accountFont.className} asia-access-control space-y-5 font-normal`}>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {[
        { label: "Tổng tài khoản", count: users.length, Icon: Users, status: "all" },
        { label: "Đang hoạt động", count: users.filter((user) => user.status === "active").length, Icon: UserRoundCheck, status: "active" },
        { label: "Tạm khóa", count: users.filter((user) => user.status === "suspended").length, Icon: LockKeyhole, status: "suspended" },
      ].map(({ label, count, Icon, status }) => {
        const isSuspended = status === "suspended";
        return <button
          key={status}
          type="button"
          aria-pressed={statusFilter === status}
          onClick={() => { setStatusFilter(status); setPage(1); }}
          className="relative isolate flex min-h-[84px] min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 xl:gap-3.5 xl:px-4"
        >
          <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 -z-10 ml-auto h-[60%] w-[44%] rounded-tl-[100%] [clip-path:shape(from_0_100%,curve_to_100%_0_with_48%_100%/57%_25%,line_to_100%_100%,close)] ${isSuspended ? "bg-orange-50" : "bg-emerald-50"}`} />
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl xl:size-14 ${isSuspended ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-700"}`}>
            <Icon aria-hidden="true" className="size-7 xl:size-8" />
          </span>
          <span className="min-w-0 space-y-1 border-l border-slate-200 pl-3 xl:pl-3.5">
            <span className="block text-sm leading-snug font-semibold text-slate-600">{label}</span>
            <strong className={`block text-[32px] leading-none font-bold tabular-nums ${isSuspended ? "text-orange-700" : "text-emerald-900"}`}>{count}</strong>
          </span>
        </button>;
      })}
    </div>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="group flex h-14 min-w-0 basis-full items-center gap-3 rounded-xl border border-(--color-slate-200) bg-white px-4 focus-within:border-emerald-600 sm:basis-48 sm:flex-1">
        <Search aria-hidden="true" className="h-6 w-6 shrink-0 text-slate-400 transition-colors group-focus-within:text-emerald-700" />
        <input ref={searchInputRef} aria-label="Tìm tài khoản" placeholder="Tìm theo tên, email, số điện thoại..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-full min-w-0 flex-1 rounded-xl border-0 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400" />
        {search.length > 0 && <button type="button" aria-label="Xóa nội dung tìm kiếm" onClick={() => { setSearch(""); setPage(1); searchInputRef.current?.focus(); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-emerald-600"><CircleX aria-hidden="true" className="h-5 w-5 fill-slate-400 text-white" /></button>}
      </div>
      {isRootAdmin && <AccountFilterSelect
        label="Lọc theo loại tài khoản" value={roleFilter}
        popoverClassName={accountFont.className}
        className="w-full max-w-full sm:w-fit sm:min-w-[250px] sm:shrink-0"
        onChange={(value) => { setRoleFilter(value); setPage(1); }}
        options={[
          { value: "all", label: "Tất cả loại tài khoản", icon: Users },
          { value: "admin", label: ACCOUNT_ROLE_LABELS.admin, icon: Crown, tone: "bg-orange-50 text-orange-600" },
          { value: "manager", label: ACCOUNT_ROLE_LABELS.manager, icon: UserRound, tone: "bg-blue-50 text-blue-600" },
          { value: "user", label: ACCOUNT_ROLE_LABELS.user, icon: UserRound, tone: "bg-slate-100 text-slate-600" },
        ]}
      />}
      <AccountFilterSelect
        label="Lọc theo trạng thái" value={statusFilter}
        popoverClassName={accountFont.className}
        className="w-full max-w-full sm:w-fit sm:min-w-[225px] sm:shrink-0"
        onChange={(value) => { setStatusFilter(value); setPage(1); }}
        options={[
          { value: "all", label: "Tất cả trạng thái", icon: Funnel },
          { value: "active", label: STATUS_LABELS.active, icon: CircleCheck, tone: "bg-emerald-50 text-emerald-600" },
          { value: "pending", label: STATUS_LABELS.pending, icon: Clock3, tone: "bg-amber-50 text-amber-500" },
          { value: "suspended", label: STATUS_LABELS.suspended, icon: LockKeyhole, tone: "bg-rose-50 text-rose-600" },
        ]}
      />
      {canUseTrash && <Link href="/admin/access-control/accounts/trash" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" />Thùng rác</Link>}
      <Link href="/admin/access-control/accounts/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-[14px] font-semibold text-white"><CirclePlus className="h-4 w-4" />Thêm tài khoản</Link>
    </div>
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div tabIndex={0} role="region" aria-label="Bảng tài khoản" className="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600"><table className="w-full min-w-[1100px] text-left text-[14px] leading-5">
        <thead className="border-b border-slate-200 bg-slate-50"><tr>{ACCOUNT_COLUMNS.map((label) => <th key={label} scope="col" className="whitespace-nowrap px-3 py-3 text-[15px] font-semibold first:pl-4 last:pr-4">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!filtered.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">Không tìm thấy tài khoản.</td></tr>}
          {filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map((user) => {
            const isSelf = user.id.toLowerCase() === currentUserId.toLowerCase();
            const isAdmin = user.accountRole === "admin";
            const statusTone = user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
            const editLabel = user.status === "pending" ? "Duyệt và gán quyền" : "Chỉnh sửa";
            return <tr key={user.id} className="align-middle hover:bg-slate-50">
              <td className="max-w-72 px-3 py-2 pl-4"><div className="flex items-center gap-3"><UserAvatar src={user.avatar} name={user.name} className="h-9 w-9 bg-emerald-100 text-xs font-bold text-emerald-800" /><div className="min-w-0"><strong className="block text-[15px] font-semibold [overflow-wrap:anywhere] text-slate-900">{user.name}</strong><span className="[overflow-wrap:anywhere] text-slate-500">{user.email}</span></div></div></td>
              <td className="whitespace-nowrap px-3 py-2">{user.phone || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2"><PermissionGroupBadge name={ACCOUNT_ROLE_LABELS[user.accountRole]} color={isAdmin ? "orange" : user.accountRole === "user" ? "slate" : "blue"} icon={isAdmin ? "crown" : "user"} /></td>
              <td className="max-w-xs px-3 py-2">{isAdmin ? <span className="whitespace-nowrap font-semibold text-emerald-700">Toàn quyền hệ thống</span> : user.accountRole === "user" ? <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600"><CircleMinus aria-hidden="true" className="h-4 w-4 shrink-0" />Không áp dụng</span> : <div className="flex flex-wrap gap-1">{user.roleIds.length ? user.roleIds.map((id) => {
                const role = roles.find((item) => item.id === id);
                return <PermissionGroupBadge key={id} name={role?.name ?? "Nhóm quyền không còn hoạt động"} color={role?.color} icon={role?.icon} />;
              }) : "Chưa gán"}</div>}</td>
              <td className="px-3 py-2">{user.status === "suspended" ? <LockedAccountStatus lock={user.lock} name={user.name} /> : <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold ${statusTone}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{STATUS_LABELS[user.status]}</span>}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-500">{user.createdAt || "—"}</td>
              <td className="w-[14%] px-3 py-2 pr-4">{canManageAccountTypes && <div className="flex w-max items-center gap-1.5">
                <Link href={`/admin/access-control/accounts/${encodeURIComponent(user.id)}/edit`} title={editLabel} aria-label={`${editLabel} ${user.name}`} className={`${ACTION_BUTTON} border-slate-200 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-emerald-600`}><Pencil aria-hidden="true" className="size-4" /></Link>
                {!isSelf && user.status === "active" && <button type="button" disabled={saving} onClick={() => { setLockReason(""); setLockTarget(user); }} title="Khóa" aria-label={`Khóa ${user.name}`} className={`${ACTION_BUTTON} border-amber-200 text-amber-700 hover:bg-amber-50 focus-visible:outline-amber-600`}><LockKeyhole aria-hidden="true" className="size-4" /></button>}
                {!isSelf && user.status === "suspended" && <button type="button" disabled={saving} onClick={() => setUnlockTarget(user)} title="Mở khóa" aria-label={`Mở khóa ${user.name}`} className={`${ACTION_BUTTON} border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-emerald-600`}><LockKeyholeOpen aria-hidden="true" className="size-4" /></button>}
                {!isSelf && <button type="button" disabled={saving} onClick={() => setDeleteTarget(user)} title="Xóa" aria-label={`Xóa ${user.name}`} className={`${ACTION_BUTTON} border-rose-200 text-rose-600 hover:bg-rose-50 focus-visible:outline-rose-600`}><Trash2 aria-hidden="true" className="size-4" /></button>}
                {!isSelf && user.status === "pending" && <button type="button" disabled={saving} onClick={() => { if (confirm(`Từ chối tài khoản ${user.name}?`)) onRejectUser(user.id); }} title="Từ chối" aria-label={`Từ chối ${user.name}`} className={`${ACTION_BUTTON} border-rose-200 text-rose-600 hover:bg-rose-50 focus-visible:outline-rose-600`}><CircleX aria-hidden="true" className="size-4" /></button>}
              </div>}</td>
            </tr>;
          })}
        </tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600"><span>Tổng cộng {filtered.length} tài khoản</span><PageSelect ariaLabel="Chọn trang tài khoản" page={safePage} pageCount={totalPages} onChange={setPage} menuClassName={accountFont.className} /></div>
    </div>
    {deleteTarget && <DeleteAccountDialog className={accountDialogClass} user={deleteTarget} saving={saving} onClose={() => setDeleteTarget(null)} onConfirm={async () => {
      if (saving || deleteTarget.id.toLowerCase() === currentUserId.toLowerCase() || !canManageAccountTypes) return;
      if (await onDeleteUser(deleteTarget.id)) setDeleteTarget(null);
    }} />}
    {lockTarget && <AccountActionDialog className={accountDialogClass} title="Khóa tài khoản?" Icon={LockKeyhole} tone="amber" confirmLabel="Khóa tài khoản" busyLabel="Đang khóa..." saving={saving}
      onClose={() => setLockTarget(null)}
      onConfirm={() => { void onLockUser(lockTarget.id, lockReason.trim()).then((done) => { if (done) setLockTarget(null); }); }}>
      <p>Tài khoản <strong>{lockTarget.name}</strong> ({lockTarget.email}) sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được cho tới khi mở khóa.</p>
      <label className="block text-[14px] font-semibold text-slate-700">Lý do khóa <span className="font-normal text-slate-500">(không bắt buộc)</span>
        <textarea value={lockReason} maxLength={LOCK_REASON_MAX} disabled={saving} rows={3} onChange={(event) => setLockReason(event.target.value)} placeholder="Ví dụ: Nghi lộ mật khẩu" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
        <span className="mt-1 block text-right text-xs font-normal text-slate-400">{lockReason.length}/{LOCK_REASON_MAX}</span>
      </label>
    </AccountActionDialog>}
    {unlockTarget && <AccountActionDialog className={accountDialogClass} title="Mở khóa tài khoản?" Icon={LockKeyholeOpen} tone={isEmployeeLock(unlockTarget.lock) ? "amber" : "emerald"} confirmLabel="Mở khóa" busyLabel="Đang mở khóa..." saving={saving}
      onClose={() => setUnlockTarget(null)}
      onConfirm={() => { void onUnlockUser(unlockTarget.id).then((done) => { if (done) setUnlockTarget(null); }); }}>
      <p>Tài khoản <strong>{unlockTarget.name}</strong> ({unlockTarget.email}) sẽ đăng nhập lại được.</p>
      {unlockTarget.lock && <p className="text-sm text-slate-500">Lý do đang khóa: {describeLock(unlockTarget.lock)}</p>}
      {isEmployeeLock(unlockTarget.lock) && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Nhân viên này đã nghỉ việc hoặc hồ sơ đã bị xóa. Bạn chắc chắn muốn mở khóa?</p>}
    </AccountActionDialog>}
  </div>;
}
