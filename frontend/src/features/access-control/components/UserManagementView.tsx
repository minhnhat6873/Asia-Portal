import React, { useState } from 'react';
import { User, Role, SystemPermission, ModuleCategory } from '../types';
import {
  Search,
  MoreVertical,
  Trash2,
  AlertTriangle,
  Users,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Check,
  CirclePlus,
  Clock3,
  UserRoundCheck,
  UserRoundX,
  RotateCcw,
} from 'lucide-react';
import { CreateUserModal } from './CreateUserModal';
import { PendingAccountsModal } from './PendingAccountsModal';
import { AdminSelect } from '@/features/admin/dashboard/components/AdminSelect';

interface UserManagementViewProps {
  users: User[];
  roles: Role[];
  permissions: SystemPermission[];
  modules: ModuleCategory[];
  onSaveUserAccess: (userId: string, access: { roleId: string; status: 'active' | 'suspended' }) => void;
  onApproveUser: (userId: string, roleId?: string) => void;
  onRejectUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onAddUser: (user: Omit<User, 'id' | 'lastActive'>) => void;
  onNavigateToCreateRole: () => void;
  onViewRoleDetail: (roleId: string) => void;
  deletedCount?: number;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  roles,
  permissions,
  modules,
  onSaveUserAccess,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
  onAddUser,
  onNavigateToCreateRole,
  onViewRoleDetail,
  deletedCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const pendingUsers = users.filter((u) => u.status === 'pending');

  // Modals state
  const [isPendingAccountsOpen, setIsPendingAccountsOpen] = useState(false);
  const [pendingAccessChanges, setPendingAccessChanges] = useState<Record<string, { roleId: string; status: 'active' | 'suspended' }>>({});
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);

    const matchesRole =
      selectedRoleFilter === 'all' || user.roleId === selectedRoleFilter;

    const matchesStatus =
      selectedStatusFilter === 'all'
        ? true
        : user.status === selectedStatusFilter;

    return user.id !== 'usr_1' && matchesSearch && matchesRole && matchesStatus;
  });
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const pageUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const resetFilters = () => { setSearchQuery(''); setSelectedRoleFilter('all'); setSelectedStatusFilter('all'); setCurrentPage(1); };


  return (
    <div className="asia-access-control space-y-6">
      {/* Account overview */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          { label: 'Tổng tài khoản', value: users.length, detail: 'Tất cả tài khoản', tone: 'bg-emerald-50 text-emerald-700', icon: Users },
          { label: 'Đang hoạt động', value: users.filter((user) => user.status === 'active').length, detail: 'Có quyền truy cập', tone: 'bg-emerald-50 text-emerald-700', icon: UserRoundCheck },
          { label: 'Chờ duyệt', value: pendingUsers.length, detail: 'Cần phê duyệt', tone: 'bg-amber-50 text-amber-700', icon: Clock3, pending: true },
          { label: 'Tạm khóa', value: users.filter((user) => user.status === 'suspended').length, detail: 'Đang tạm ngưng', tone: 'bg-orange-50 text-orange-700', icon: UserRoundX },
          { label: 'Đã xóa', value: deletedCount, detail: 'Trong thùng rác', tone: 'bg-rose-50 text-rose-700', icon: Trash2 },
        ].map(({ label, value, detail, tone, icon: Icon, pending }) => (
          <button key={label} type="button" onClick={pending ? () => setIsPendingAccountsOpen(true) : undefined} className={`flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm ${pending ? 'cursor-pointer hover:border-amber-300' : 'cursor-default'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium text-slate-500">{label}</span><span className="mt-0.5 flex items-baseline gap-2"><strong className="text-xl leading-none text-slate-900">{value}</strong><span className="text-[10px] text-slate-400">{detail}</span></span></span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          {/* Role Filter */}
          <AdminSelect
            value={selectedRoleFilter}
            onChange={(value) => { setSelectedRoleFilter(value); setCurrentPage(1); }}
            className="min-w-40 flex-1"
            searchable={false}
            showSelectionCheck={false}
            options={[{ value: 'all', label: `Tất cả nhóm quyền (${roles.length})` }, ...roles.map((role) => ({ value: role.id, label: role.name }))]}
          />

          {/* Status Filter */}
          <AdminSelect
            value={selectedStatusFilter}
            onChange={(value) => { setSelectedStatusFilter(value); setCurrentPage(1); }}
            className="min-w-36 flex-1"
            searchable={false}
            showSelectionCheck={false}
            options={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'active', label: 'Đang hoạt động' }, { value: 'pending', label: 'Chờ duyệt' }, { value: 'suspended', label: 'Tạm khóa' }]}
          />

          {(searchQuery || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all') && <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" />Đặt lại</button>}
          <button type="button" onClick={() => setIsCreateUserOpen(true)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800"><CirclePlus className="h-4 w-4" />Thêm tài khoản</button>
          <div className="relative">
            <button type="button" onClick={() => setIsMoreMenuOpen((open) => !open)} aria-label="Thao tác khác" aria-expanded={isMoreMenuOpen} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><MoreVertical className="h-4 w-4" /></button>
            {isMoreMenuOpen && <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"><button type="button" onClick={() => { setIsPendingAccountsOpen(true); setIsMoreMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Tài khoản chờ duyệt ({pendingUsers.length})</button><button type="button" onClick={() => { onNavigateToCreateRole(); setIsMoreMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Tạo nhóm quyền</button></div>}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-xs text-slate-700">
            <colgroup>
              <col className="w-10" /><col className="w-[20%]" /><col className="w-[16%]" /><col className="w-[12%]" />
              <col className="w-[15%]" /><col className="w-[13%]" /><col className="w-[12%]" /><col className="w-[9%]" />
            </colgroup>
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3"><input type="checkbox" aria-label="Chọn tất cả tài khoản trên trang" className="h-4 w-4 rounded border-slate-300 accent-emerald-700" /></th>
                <th className="px-3 py-3">Nhân sự / Tài khoản</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Số điện thoại</th>
                <th className="px-3 py-3">Nhóm quyền</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Ngày tạo</th><th className="px-3 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                pageUsers.map((user) => {
                  const isCurrentUser = user.id === 'usr_1';
                  const selectedAccess = pendingAccessChanges[user.id] ?? {
                    roleId: user.roleId,
                    status: user.status === 'suspended' ? 'suspended' : 'active',
                  };
                  const hasPendingAccessChange =
                    selectedAccess.roleId !== user.roleId || selectedAccess.status !== user.status;

                  return (
                    <tr
                      key={user.id}
                      className="group transition-colors hover:bg-emerald-50/50"
                    >
                      <td className="px-3 py-3"><input type="checkbox" aria-label={`Chọn ${user.name}`} className="h-4 w-4 rounded border-slate-300 accent-emerald-700" /></td>
                      <td className="px-3 py-3"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">{user.name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span><span className="truncate font-semibold text-slate-800">{user.name}</span></div></td>
                      <td className="truncate px-3 py-3 text-slate-500">{user.email || '—'}</td>
                      <td className="px-3 py-3 text-slate-500">{user.phone || '—'}</td>
                      <td className="px-3 py-3">{editingUserId === user.id ? <select value={selectedAccess.roleId} onChange={(event) => setPendingAccessChanges((items) => ({ ...items, [user.id]: { ...selectedAccess, roleId: event.target.value } }))} aria-label={`Nhóm quyền của ${user.name}`} className="max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700"><option value="">Chưa gán</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select> : <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">{roles.find((role) => role.id === selectedAccess.roleId)?.name ?? '—'}</span>}</td>
                      <td className="px-3 py-3">{editingUserId === user.id ? <select value={selectedAccess.status} onChange={(event) => setPendingAccessChanges((items) => ({ ...items, [user.id]: { ...selectedAccess, status: event.target.value as 'active' | 'suspended' } }))} aria-label={`Trạng thái của ${user.name}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700"><option value="active">Đang hoạt động</option><option value="suspended">Tạm khóa</option></select> : <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : user.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{user.status === 'active' ? 'Đang hoạt động' : user.status === 'pending' ? 'Chờ duyệt' : user.status === 'rejected' ? 'Từ chối' : 'Tạm khóa'}</span>}</td>
                      <td className="px-3 py-3 text-slate-500">{user.createdAt || '—'}</td>
                      <td className="px-3 py-3"><div className="flex items-center justify-center gap-1">
                          <button type="button" title={editingUserId === user.id ? 'Lưu thay đổi' : 'Chỉnh sửa tài khoản'} aria-label={editingUserId === user.id ? 'Lưu thay đổi' : `Chỉnh sửa ${user.name}`} onClick={() => {
                            if (editingUserId === user.id) {
                              if (hasPendingAccessChange) onSaveUserAccess(user.id, selectedAccess);
                              setPendingAccessChanges((items) => { const next = { ...items }; delete next[user.id]; return next; });
                              setEditingUserId(null);
                            } else setEditingUserId(user.id);
                          }} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700">{editingUserId === user.id ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}</button>
                          <button type="button" title="Xem nhóm quyền" aria-label={`Xem nhóm quyền của ${user.name}`} onClick={() => selectedAccess.roleId ? onViewRoleDetail(selectedAccess.roleId) : onNavigateToCreateRole()} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><Pencil className="h-4 w-4" /></button>
                          {!isCurrentUser && <button type="button" onClick={() => setUserToDelete(user)} aria-label={`Xóa tài khoản ${user.name}`} title="Chuyển vào thùng rác" className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
          <span>Hiển thị {filteredUsers.length === 0 ? 0 : (safePage - 1) * pageSize + 1} - {Math.min(safePage * pageSize, filteredUsers.length)} trong tổng số {filteredUsers.length} tài khoản</span>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Trang trước" disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            {Array.from({ length: Math.min(pageCount, 3) }, (_, index) => Math.max(1, Math.min(pageCount - 2, safePage - 1)) + index).map((page) => <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`min-w-8 rounded-lg border px-2 py-1.5 font-semibold ${page === safePage ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{page}</button>)}
            <button type="button" aria-label="Trang sau" disabled={safePage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }} aria-label="Số tài khoản mỗi trang" className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-600"><option value={10}>10 / trang</option><option value={20}>20 / trang</option><option value={50}>50 / trang</option></select>
          </div>
        </div>
      </div>

      {/* Modals */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.25)] p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><AlertTriangle className="h-5 w-5" /></span>
              <div>
                <h2 id="delete-account-title" className="text-base font-bold text-slate-900">X&#x00F3;a t&#x00E0;i kho&#x1EA3;n?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {'B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a t\u00e0i kho\u1ea3n '}<strong className="text-slate-800">{userToDelete.name}</strong>?
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setUserToDelete(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">Hủy</button>
              <button type="button" onClick={() => { onDeleteUser(userToDelete.id); setUserToDelete(null); }} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700"><Trash2 className="h-4 w-4" />Xóa tài khoản</button>
            </div>
          </div>
        </div>
      )}

      {isPendingAccountsOpen && (
        <PendingAccountsModal
          users={users}
          onClose={() => setIsPendingAccountsOpen(false)}
          onApproveUser={onApproveUser}
          onRejectUser={onRejectUser}
          onDeleteUser={onDeleteUser}
        />
      )}

      {isCreateUserOpen && (
        <CreateUserModal
          roles={roles}
          onClose={() => setIsCreateUserOpen(false)}
          onSave={onAddUser}
        />
      )}
    </div>
  );
};


