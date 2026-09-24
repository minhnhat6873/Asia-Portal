import React, { useState } from 'react';
import { User, Role, SystemPermission, ModuleCategory } from '../types';
import {
  Search,
  Filter,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Eye,
  Sliders,
  MoreVertical,
  CheckCircle2,
  Lock,
  Unlock,
  Building2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { AssignRoleModal } from './AssignRoleModal';
import { UserDetailModal } from './UserDetailModal';
import { CreateUserModal } from './CreateUserModal';
import { PendingAccountsModal } from './PendingAccountsModal';

interface UserManagementViewProps {
  users: User[];
  roles: Role[];
  permissions: SystemPermission[];
  modules: ModuleCategory[];
  onUpdateUserRole: (userId: string, newRoleId: string) => void;
  onApproveUser: (userId: string, roleId?: string) => void;
  onRejectUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onToggleUserStatus: (userId: string) => void;
  onAddUser: (user: Omit<User, 'id' | 'lastActive'>) => void;
  onNavigateToCreateRole: () => void;
  onViewRoleDetail: (roleId: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  roles,
  permissions,
  modules,
  onUpdateUserRole,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
  onToggleUserStatus,
  onAddUser,
  onNavigateToCreateRole,
  onViewRoleDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const rejectedUsers = users.filter((u) => u.status === 'rejected');
  const [isRejectedAccountsOpen, setIsRejectedAccountsOpen] = useState(false);

  // Modals state
  const [isPendingAccountsOpen, setIsPendingAccountsOpen] = useState(false);
  const [userToAssign, setUserToAssign] = useState<User | null>(null);
  const [userToInspect, setUserToInspect] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

  // Filtered users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);

    const matchesRole =
      selectedRoleFilter === 'all' || user.roleId === selectedRoleFilter;

    const matchesStatus =
      selectedStatusFilter === 'all' || user.status === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeStyle = (role: Role | undefined) => {
    switch (role?.color) {
      case 'emerald':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'blue':
        return 'bg-sky-50 border-sky-200 text-sky-800';
      case 'amber':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'rose':
        return 'bg-rose-50 border-rose-200 text-rose-800';
      case 'purple':
        return 'bg-violet-50 border-violet-200 text-violet-800';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="asia-access-control space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 text-center">
          <span className="text-xs text-slate-400 font-medium">Tổng người dùng</span>
          <div className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
            {users.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Toàn chuỗi cửa hàng</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 text-center">
          <span className="text-xs text-slate-400 font-medium">Đang hoạt động</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
            {users.filter((u) => u.status === 'active').length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Đủ điều kiện đăng nhập</p>
        </div>

        <button
          type="button"
          onClick={() => setIsRejectedAccountsOpen(true)}
          className="rounded-xl border border-rose-300 bg-rose-50/50 p-4 text-center transition-colors hover:bg-rose-50"
        >
          <span className="text-xs text-rose-600 font-medium">Tài khoản từ chối</span>
          <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-1">
            {rejectedUsers.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Xem danh sách tài khoản đã từ chối
          </p>
        </button>

        <button
          type="button"
          onClick={() => setIsPendingAccountsOpen(true)}
          title="Bấm để xem danh sách tài khoản chờ duyệt"
          className={`bg-slate-900/50 rounded-xl p-4 text-center transition-colors ${
            pendingUsers.length > 0
              ? 'pending-alert border-2 border-orange-500/50 cursor-pointer hover:bg-slate-900/80'
              : 'border border-slate-800/80 cursor-pointer hover:bg-slate-900/80'
          }`}
        >
          <span className="text-xs text-slate-400 font-medium">Tài khoản chưa duyệt</span>
          <div
            className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              pendingUsers.length > 0 ? 'text-orange-400' : 'text-teal-400'
            }`}
          >
            {pendingUsers.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {pendingUsers.length > 0
              ? 'Cần phê duyệt truy cập'
              : 'Không có tài khoản chờ duyệt'}
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
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tất cả nhóm quyền ({roles.length})</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="suspended">Tạm khóa</option>
            <option value="pending">Chờ duyệt</option>
            <option value="rejected">Đã từ chối</option>
          </select>

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
              <col className="w-[28%]" />
              <col className="w-[27%]" />
              <col className="w-[18%]" />
              <col className="w-[27%]" />
            </colgroup>
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nhân sự / Tài khoản</th>
                <th className="py-3.5 px-4">Nhóm quyền hiện tại</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="px-4 py-3.5 text-center">Thao tác phân quyền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const role = roles.find((r) => r.id === user.roleId);
                  const isCurrentUser = user.id === 'usr_1';

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

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => role && onViewRoleDetail(role.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-transform hover:scale-102 cursor-pointer ${getRoleBadgeStyle(
                            role
                          )}`}
                          title="Bấm để xem danh sách quyền gán cho nhóm này"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{role?.name || 'Chưa gán'}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            user.status === 'active'
                              ? 'text-emerald-400'
                              : user.status === 'pending'
                                ? 'text-orange-400'
                                : 'text-rose-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'active'
                                ? 'bg-emerald-400'
                                : user.status === 'pending'
                                  ? 'bg-orange-400'
                                  : 'bg-rose-400'
                            }`}
                          />
                          {user.status === 'active'
                            ? 'Hoạt động'
                            : user.status === 'pending'
                              ? 'Chờ duyệt'
                              : user.status === 'rejected'
                                ? 'Đã từ chối'
                                : 'Tạm khóa'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="grid grid-cols-[1.75rem_auto_1.75rem] items-center justify-center gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setUserToInspect(user)}
                            className="justify-self-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                            title="Xem chi tiết quyền được cấp"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Assign role button */}
                          <button
                            onClick={() => setUserToAssign(user)}
                            className="justify-self-center flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                            title="Gán nhóm quyền khác cho người dùng"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Phân quyền</span>
                          </button>

                          {/* Toggle lock */}
                          {!isCurrentUser ? (
                            <button
                              onClick={() => onToggleUserStatus(user.id)}
                              className={`justify-self-center rounded-lg p-1.5 transition-colors ${
                                user.status === 'active'
                                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
                                  : 'text-emerald-400 hover:bg-emerald-950/30'
                              }`}
                              title={
                                user.status === 'active'
                                  ? 'Tạm khóa tài khoản'
                                  : 'Mở khóa tài khoản'
                              }
                            >
                              {user.status === 'active' ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Unlock className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span aria-hidden="true" className="h-7 w-7" />
                          )}
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
      {isPendingAccountsOpen && (
        <PendingAccountsModal
          mode="pending"
          users={users}
          roles={roles}
          onClose={() => setIsPendingAccountsOpen(false)}
          onApproveUser={onApproveUser}
          onRejectUser={onRejectUser}
          onDeleteUser={onDeleteUser}
        />
      )}

      {isRejectedAccountsOpen && (
        <PendingAccountsModal
          mode="rejected"
          users={users}
          roles={roles}
          onClose={() => setIsRejectedAccountsOpen(false)}
          onApproveUser={onApproveUser}
          onRejectUser={onRejectUser}
          onDeleteUser={onDeleteUser}
        />
      )}

      {userToAssign && (
        <AssignRoleModal
          user={userToAssign}
          roles={roles}
          permissions={permissions}
          onClose={() => setUserToAssign(null)}
          onSave={onUpdateUserRole}
        />
      )}

      {userToInspect && (
        <UserDetailModal
          user={userToInspect}
          role={roles.find((r) => r.id === userToInspect.roleId)}
          permissions={permissions}
          modules={modules}
          onClose={() => setUserToInspect(null)}
          onOpenAssign={(u) => setUserToAssign(u)}
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


