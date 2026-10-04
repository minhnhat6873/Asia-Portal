import React, { useState } from 'react';
import { User, Role, SystemPermission, ModuleCategory } from '../types';
import {
  Search,
  Filter,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Sliders,
  MoreVertical,
  CheckCircle2,
  Building2,
  RefreshCw,
  Sparkles,
  Trash2,
  AlertTriangle,
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
  const hasPendingUsers = pendingUsers.length > 0;

  // Filtered users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);

    const matchesRole =
      selectedRoleFilter === 'all' || user.roleId === selectedRoleFilter;

    // Pending and rejected registrations are deliberately isolated in their
    // respective approval areas, not mixed into the main user-management table.
    const matchesStatus =
      selectedStatusFilter === 'all'
        ? user.status !== 'pending' && user.status !== 'rejected'
        : user.status === selectedStatusFilter;

    return user.id !== 'usr_1' && matchesSearch && matchesRole && matchesStatus;
  });


  return (
    <div className="asia-access-control space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4">

        <button
          type="button"
          onClick={() => setIsPendingAccountsOpen(true)}
          title={'B\u1ea5m \u0111\u1ec3 xem danh s\u00e1ch t\u00e0i kho\u1ea3n ch\u1edd duy\u1ec7t'}
          className={`rounded-xl bg-slate-900/50 p-4 text-center transition-colors ${
            hasPendingUsers
              ? 'pending-alert cursor-pointer border-2 border-orange-500/50 hover:bg-slate-900/80'
              : 'cursor-pointer border border-slate-800/80 hover:bg-slate-900/80'
          }`}
        >
          <span className="text-xs font-medium text-slate-400">{'T\u00e0i kho\u1ea3n ch\u01b0a duy\u1ec7t'}</span>
          <div
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              hasPendingUsers ? 'text-orange-400' : 'text-teal-400'
            }`}
          >
            {pendingUsers.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {hasPendingUsers
              ? '\u0043\u1ea7n ph\u00ea duy\u1ec7t truy c\u1eadp'
              : '\u004bh\u00f4ng c\u00f3 t\u00e0i kho\u1ea3n ch\u1edd duy\u1ec7t'}
          </p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên nhân viên, email, số điện thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <AdminSelect
            value={selectedRoleFilter}
            onChange={setSelectedRoleFilter}
            className="min-w-52"
            searchable={false}
            showSelectionCheck={false}
            options={[{ value: 'all', label: `Tất cả nhóm quyền (${roles.length})` }, ...roles.map((role) => ({ value: role.id, label: role.name }))]}
          />

          {/* Status Filter */}
          <AdminSelect
            value={selectedStatusFilter}
            onChange={setSelectedStatusFilter}
            className="min-w-44"
            searchable={false}
            showSelectionCheck={false}
            options={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'active', label: 'Đang hoạt động' }, { value: 'suspended', label: 'Tạm khóa' }]}
          />

          {(searchQuery || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRoleFilter('all');
                setSelectedStatusFilter('all');
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm text-slate-700">
            <colgroup>
              <col className="w-[42%]" />
              <col className="w-[18%]" />
              <col className="w-[40%]" />
            </colgroup>
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nh&acirc;n s&#7921; / T&agrave;i kho&#7843;n</th>
                <th className="px-4 py-3.5 text-center">X&oacute;a t&agrave;i kho&#7843;n</th>
                <th className="px-4 py-3.5 text-center">Tr&#7841;ng th&aacute;i &amp; Ph&acirc;n quy&#7873;n</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
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
                      {/* Name & Account */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white truncate">
                                {user.name}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
                                  Bạn
                                </span>
                              )}
                            </div>
                        </div>
                      </td>


                      {/* Delete account */}
                      <td className="px-4 py-3.5 text-center">
                        {!isCurrentUser ? (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                            title="Chuyển tài khoản vào thùng rác"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xóa</span>
                          </button>
                        ) : (
                          <span className="inline-block h-7" />
                        )}
                      </td>
                      {/* Status and role are saved together for this account. */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <select
                            value={selectedAccess.status}
                            onChange={(event) =>
                              setPendingAccessChanges((items) => ({
                                ...items,
                                [user.id]: { ...selectedAccess, status: event.target.value as 'active' | 'suspended' },
                              }))
                            }
                            aria-label={'Ch\u1ecdn tr\u1ea1ng th\u00e1i cho ' + user.name}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-emerald-500"
                          >
                            <option value="active">{'\u0110ang ho\u1ea1t \u0111\u1ed9ng'}</option>
                            <option value="suspended">{'T\u1ea1m kh\u00f3a'}</option>
                          </select>
                          <select
                            value={selectedAccess.roleId}
                            onChange={(event) =>
                              setPendingAccessChanges((items) => ({
                                ...items,
                                [user.id]: { ...selectedAccess, roleId: event.target.value },
                              }))
                            }
                            aria-label={'Ch\u1ecdn nh\u00f3m quy\u1ec1n cho ' + user.name}
                            className="max-w-[13rem] rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 outline-none transition-colors focus:border-emerald-500"
                          >
                            <option value="">{'Ch\u01b0a g\u00e1n nh\u00f3m quy\u1ec1n'}</option>
                            {roles.map((roleOption) => (
                              <option key={roleOption.id} value={roleOption.id}>
                                {roleOption.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!hasPendingAccessChange}
                            onClick={() => {
                              onSaveUserAccess(user.id, selectedAccess);
                              setPendingAccessChanges((items) => {
                                const next = { ...items };
                                delete next[user.id];
                                return next;
                              });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {'L\u01b0u'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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


