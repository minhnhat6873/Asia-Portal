import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Search,
  Sliders,
  CheckCircle2,
  XCircle,
  Trash2,
  Mail,
  Building2,
  Calendar,
  X,
  FileSpreadsheet,
  Users,
  Newspaper,
  LayoutDashboard,
  RotateCcw,
} from 'lucide-react';
import { UserAccount, UserRole, UserPermissions, UserStatus } from '../types';

/**
 * "Phân quyền quản lý" — ported from the standalone `asia-f&b-beverage-admin`
 * project. Approval workflow: a registered account stays blocked from signing in
 * until an admin approves it *and* assigns a role + granular permissions here.
 *
 * The two props the original had for the old AuthModal (`onOpenRegisterModal`,
 * `onSwitchUser`) are dropped: this portal has no auth modal, so there is nothing
 * for those buttons to open.
 */
interface PermissionsManagementProps {
  users: UserAccount[];
  currentUser: UserAccount | null;
  onApproveUser: (userId: string, role: UserRole, permissions: UserPermissions) => void;
  onRejectUser: (userId: string, reason: string) => void;
  onUpdatePermissions: (userId: string, role: UserRole, permissions: UserPermissions) => void;
  onToggleLockUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên cấp cao (Admin)',
  hr_manager: 'Quản lý Nhân sự',
  media_manager: 'Quản lý Truyền thông',
  staff: 'Chuyên viên nghiệp vụ',
  viewer: 'Tài khoản chỉ xem',
};

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  hr_manager: 'bg-blue-100 text-blue-800 border-blue-200',
  media_manager: 'bg-amber-100 text-amber-800 border-amber-200',
  staff: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  viewer: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ASSIGNABLE_ROLES: UserRole[] = ['admin', 'hr_manager', 'media_manager'];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    canViewDashboard: true,
    canManageEmployees: true,
    canManageMedia: true,
    canManagePermissions: true,
    canExportData: true,
  },
  hr_manager: {
    canViewDashboard: true,
    canManageEmployees: true,
    canManageMedia: false,
    canManagePermissions: false,
    canExportData: true,
  },
  media_manager: {
    canViewDashboard: true,
    canManageEmployees: false,
    canManageMedia: true,
    canManagePermissions: false,
    canExportData: false,
  },
  staff: {
    canViewDashboard: true,
    canManageEmployees: false,
    canManageMedia: false,
    canManagePermissions: false,
    canExportData: false,
  },
  viewer: {
    canViewDashboard: true,
    canManageEmployees: false,
    canManageMedia: false,
    canManagePermissions: false,
    canExportData: false,
  },
};

export const PermissionsManagement: React.FC<PermissionsManagementProps> = ({
  users,
  currentUser,
  onApproveUser,
  onRejectUser,
  onUpdatePermissions,
  onToggleLockUser,
  onDeleteUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [workspaceUserId, setWorkspaceUserId] = useState<string | null>(null);

  // Modal states
  const [approvingUser, setApprovingUser] = useState<UserAccount | null>(null);
  const [rejectingUser, setRejectingUser] = useState<UserAccount | null>(null);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<UserAccount | null>(null);

  // Approval / Permission form state
  const [selectedRole, setSelectedRole] = useState<UserRole>('hr_manager');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_ROLE_PERMISSIONS.hr_manager);
  const [rejectReason, setRejectReason] = useState('');

  // Stats calculation
  const totalCount = users.length;
  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const approvedCount = users.filter((u) => u.status === 'approved').length;
  const rejectedCount = users.filter((u) => u.status === 'rejected').length;
  const lockedCount = users.filter((u) => u.status === 'locked').length;

  // Filtered users list
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true : user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const workspaceUser =
    filteredUsers.find((user) => user.id === workspaceUserId) ?? filteredUsers[0] ?? null;

  const handleSelectWorkspaceUser = (user: UserAccount) => {
    setWorkspaceUserId(user.id);
    setSelectedRole(user.role);
    setPermissions(user.permissions);
  };

  const workspaceRole = workspaceUser?.id === workspaceUserId ? selectedRole : workspaceUser?.role;
  const workspacePermissions =
    workspaceUser?.id === workspaceUserId ? permissions : workspaceUser?.permissions;

  const handleWorkspaceRoleChange = (role: UserRole) => {
    if (workspaceUser) setWorkspaceUserId(workspaceUser.id);
    handleRoleChange(role);
  };

  const handleWorkspacePermissionChange = (key: keyof UserPermissions) => {
    if (!workspaceUser) return;
    if (workspaceUser.id !== workspaceUserId) {
      setWorkspaceUserId(workspaceUser.id);
      setSelectedRole(workspaceUser.role);
      setPermissions({ ...workspaceUser.permissions, [key]: !workspaceUser.permissions[key] });
      return;
    }
    handlePermissionCheckbox(key);
  };

  const handleOpenApproveModal = (user: UserAccount) => {
    setApprovingUser(user);
    setSelectedRole(user.role || 'staff');
    setPermissions(user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.staff);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setEditingPermissionsUser(user);
    setSelectedRole(user.role);
    setPermissions(user.permissions);
  };

  // Choosing a role pre-fills that role's suggested permissions.
  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    setPermissions(DEFAULT_ROLE_PERMISSIONS[newRole]);
  };

  const handlePermissionCheckbox = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmApproval = () => {
    if (!approvingUser) return;
    onApproveUser(approvingUser.id, selectedRole, permissions);
    setApprovingUser(null);
  };

  const handleConfirmReject = () => {
    if (!rejectingUser) return;
    onRejectUser(
      rejectingUser.id,
      rejectReason.trim() || 'Thông tin đăng ký chưa được duyệt bởi Quản trị viên'
    );
    setRejectingUser(null);
    setRejectReason('');
  };

  const handleConfirmEditPermissions = () => {
    if (!editingPermissionsUser) return;
    onUpdatePermissions(editingPermissionsUser.id, selectedRole, permissions);
    setEditingPermissionsUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="hidden">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">
                Bảo Mật &amp; Phân Quyền
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Phân Quyền Quản Lý &amp; Duyệt Tài Khoản
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed pt-1">
            Quy trình phê duyệt nghiêm ngặt: Khi người dùng tạo nick đăng ký, tài khoản phải được
            <strong className="text-slate-800 font-semibold"> Admin duyệt và phân quyền </strong>
            thì mới có thể đăng nhập vào hệ thống Asia F&amp;B.
          </p>
        </div>
      </div>

      {/* Pending Account Alert Banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-base flex items-center gap-2">
                <span>Có {pendingCount} tài khoản đăng ký đang chờ phê duyệt</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-200 text-amber-900">
                  Cần xử lý
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                Các tài khoản này hiện bị chặn đăng nhập cho đến khi bạn bấm Duyệt &amp; Cấp quyền hạn tương ứng.
              </p>
            </div>
          </div>

          <button
            onClick={() => setStatusFilter('pending')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
          >
            Xem danh sách chờ duyệt ({pendingCount})
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all ${
            statusFilter === 'all'
              ? 'border-slate-800 ring-2 ring-slate-800/20 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-slate-500 font-medium">Tổng người dùng</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Hồ sơ đã ghi nhận</div>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`cursor-pointer bg-amber-50/60 rounded-2xl p-4 border transition-all ${
            statusFilter === 'pending'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-amber-200/80 hover:border-amber-300'
          }`}
        >
          <div className="text-xs text-amber-800 font-medium flex items-center justify-between">
            <span>Chờ duyệt</span>
            {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Chưa được đăng nhập</div>
        </div>

        <div
          onClick={() => setStatusFilter('approved')}
          className={`cursor-pointer bg-emerald-50/60 rounded-2xl p-4 border transition-all ${
            statusFilter === 'approved'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-emerald-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="text-xs text-emerald-800 font-medium">Đã cấp quyền</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Được phép đăng nhập</div>
        </div>

        <div
          onClick={() => setStatusFilter('rejected')}
          className={`cursor-pointer bg-rose-50/60 rounded-2xl p-4 border transition-all ${
            statusFilter === 'rejected'
              ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
              : 'border-rose-200/80 hover:border-rose-300'
          }`}
        >
          <div className="text-xs text-rose-800 font-medium">Từ chối / Đã khóa</div>
          <div className="text-2xl font-black text-rose-900 mt-1">{rejectedCount + lockedCount}</div>
          <div className="text-[11px] text-rose-700 mt-0.5">Bị chặn truy cập</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, email, tài khoản..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>Chờ duyệt</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingCount}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Đã duyệt ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Đã từ chối ({rejectedCount})
          </button>
          <button
            onClick={() => setStatusFilter('locked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'locked'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Đã khóa ({lockedCount})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 pl-6 pr-4 w-[280px]">Người dùng</th>
                <th className="py-3.5 px-4 w-[240px]">Phòng ban &amp; mục đích</th>
                <th className="py-3.5 px-4 w-[140px]">Trạng thái</th>
                <th className="py-3.5 px-4 w-[230px]">Vai trò &amp; quyền hạn</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600">Không tìm thấy tài khoản nào</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id;
                  const isPending = user.status === 'pending';
                  const isApproved = user.status === 'approved';
                  const isRejected = user.status === 'rejected';
                  const isLocked = user.status === 'locked';

                  return (
                    <tr
                      key={user.id}
                      className={`align-top hover:bg-slate-50/70 transition-colors ${isPending ? 'bg-amber-50/30' : ''}`}
                    >
                      {/* Col 1: User profile */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {user.fullName.slice(0, 2).toUpperCase()}
                          </div>

                          {/* min-w-0 lets the long email truncate instead of
                              shoving the name and badge out of alignment. */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-bold text-sm text-slate-900 truncate max-w-[160px]">
                                {user.fullName}
                              </span>
                              {isCurrent && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold whitespace-nowrap">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs font-medium text-slate-500 truncate">
                              @{user.username}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Department & purpose */}
                      <td className="py-4 px-4">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{user.department}</span>
                        </p>
                        {user.registrationReason && (
                          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                            &ldquo;{user.registrationReason}&rdquo;
                          </p>
                        )}
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>Đăng ký: {user.createdAt}</span>
                        </p>
                      </td>

                      {/* Col 3: Status badge */}
                      <td className="py-4 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse" />
                            <span className="whitespace-nowrap">Chờ duyệt</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span className="whitespace-nowrap">Đã phê duyệt</span>
                          </span>
                        )}
                        {isRejected && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-900">
                              <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                              <span className="whitespace-nowrap">Bị từ chối</span>
                            </span>
                            {user.rejectReason && (
                              <p
                                className="text-[11px] leading-relaxed text-rose-600 line-clamp-2"
                                title={user.rejectReason}
                              >
                                {user.rejectReason}
                              </p>
                            )}
                          </div>
                        )}
                        {isLocked && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-800">
                            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                            <span className="whitespace-nowrap">Đã khóa</span>
                          </span>
                        )}
                      </td>

                      {/* Col 4: Role & permissions */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-bold leading-snug ${ROLE_BADGE_COLORS[user.role]}`}
                        >
                          {ROLE_LABELS[user.role]}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {user.permissions.canManagePermissions && (
                              <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                                Toàn quyền
                              </span>
                            )}
                            {user.permissions.canManageEmployees && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                Nhân sự
                              </span>
                            )}
                            {user.permissions.canManageMedia && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                Truyền thông
                              </span>
                            )}
                            {user.permissions.canExportData && (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Xuất file
                              </span>
                            )}
                          </div>
                      </td>

                      {/* Col 5: Actions */}
                      <td className="py-4 pl-4 pr-6">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleOpenApproveModal(user)}
                                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Duyệt &amp; phân quyền</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingUser(user);
                                  setRejectReason('');
                                }}
                                className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Từ chối</span>
                              </button>
                            </>
                          )}

                          {(isApproved || isLocked) && (
                            <>
                              {isApproved && (
                                <button
                                  onClick={() => handleOpenEditModal(user)}
                                  title="Chỉnh sửa quyền"
                                  className="rounded-xl bg-slate-100 p-2 text-slate-700 transition-colors hover:bg-slate-200"
                                >
                                  <Sliders className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                onClick={() => onToggleLockUser(user.id)}
                                title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                className={`rounded-xl p-2 transition-colors ${
                                  isLocked
                                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                              </button>
                            </>
                          )}

                          {isRejected && (
                            <button
                              onClick={() => handleOpenApproveModal(user)}
                              className="whitespace-nowrap rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-600"
                            >
                              Duyệt lại
                            </button>
                          )}

                          {/* Delete account */}
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Bạn có chắc muốn xóa vĩnh viễn tài khoản @${user.username} (${user.fullName})?`
                                  )
                                ) {
                                  onDeleteUser(user.id);
                                }
                              }}
                              title="Xóa tài khoản"
                              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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

      </div>

      {/* Permission workspace */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên, email, tài khoản"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              title="Làm mới dữ liệu"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-[11px] font-semibold">
              {[
                ['all', 'Tất cả', totalCount],
                ['pending', 'Chờ duyệt', pendingCount],
                ['approved', 'Đã duyệt', approvedCount],
                ['rejected', 'Đã từ chối', rejectedCount],
                ['locked', 'Đã khóa', lockedCount],
              ].map(([status, label, count]) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status as 'all' | UserStatus)}
                  className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                    statusFilter === status ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label} <span className="ml-1 text-slate-400">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/60 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-700">
              Danh sách nhân sự ({filteredUsers.length})
            </div>
            <div className="max-h-[620px] overflow-y-auto py-1.5">
              {filteredUsers.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-slate-400">Không tìm thấy tài khoản phù hợp.</p>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = workspaceUser?.id === user.id;
                  const isOnline = user.status === 'approved';
                  const statusColor = user.status === 'pending' ? 'bg-amber-500' : user.status === 'locked' || user.status === 'rejected' ? 'bg-rose-500' : 'bg-emerald-500';
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectWorkspaceUser(user)}
                      className={`relative flex w-full gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected ? 'border-l-4 border-violet-500 bg-violet-50' : 'border-l-4 border-transparent hover:bg-slate-100/80'
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-white">
                        {user.fullName.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-800">{user.fullName}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">{user.department}</span>
                        <span className="mt-1 block truncate text-[10px] text-slate-400">@{user.username} · {ROLE_LABELS[user.role]}</span>
                      </span>
                      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${isOnline ? 'bg-emerald-500' : statusColor}`} />
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="min-w-0 p-5 md:p-6">
            {workspaceUser && workspaceRole && workspacePermissions ? (
              <div className="space-y-5">
                {workspaceUser.role === 'admin' && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">
                    Tài khoản Admin được bảo vệ: luôn có toàn quyền và không thể khóa hoặc thay đổi phân quyền.
                  </div>
                )}
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-sm font-bold text-white">
                      {workspaceUser.fullName.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-slate-900">{workspaceUser.fullName}</h2>
                        {currentUser?.id === workspaceUser.id && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Tài khoản của bạn</span>}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">@{workspaceUser.username} · {workspaceUser.email}</p>
                    </div>
                  </div>
                  {workspaceUser.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => onToggleLockUser(workspaceUser.id)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                        workspaceUser.status === 'locked' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {workspaceUser.status === 'locked' ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {workspaceUser.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                    <span>Họ và tên</span>
                    <input value={workspaceUser.fullName} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 outline-none" />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                    <span>Email nội bộ (@asiafnb.com)</span>
                    <input value={workspaceUser.email} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 outline-none" />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                    <span>Phòng ban trực thuộc</span>
                    <input value={workspaceUser.department} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 outline-none" />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                    <span>Trạng thái phê duyệt</span>
                    <div className="flex h-[34px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700">
                      {workspaceUser.status === 'approved' ? 'Đã duyệt' : workspaceUser.status === 'pending' ? 'Chờ duyệt' : workspaceUser.status === 'locked' ? 'Đã khóa' : 'Đã từ chối'}
                    </div>
                  </label>
                </div>

                <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
                  <span>Vai trò và chức năng phân quyền</span>
                  <select
                    value={workspaceRole}
                    onChange={(event) => handleWorkspaceRoleChange(event.target.value as UserRole)}
                    disabled={workspaceUser.role === 'admin'}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {ASSIGNABLE_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                  </select>
                </label>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">Ma trận quyền hạn chi tiết</h3>
                    <span className="text-[10px] text-slate-400">Admin có thể bật hoặc tắt từng quyền</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      ['canViewDashboard', 'Bảng điều khiển', 'Xem thông tin tổng quan của hệ thống'],
                      ['canManageEmployees', 'Nhân sự', 'Xem hồ sơ, duyệt phép, đánh giá nhân sự'],
                      ['canManageMedia', 'Truyền thông', 'Đăng tải và quản lý bài viết nội bộ'],
                      ['canExportData', 'Xuất file', 'Xuất báo cáo dữ liệu và danh sách nhân sự'],
                      ['canManagePermissions', 'Phân quyền', 'Duyệt tài khoản và thiết lập quyền truy cập'],
                    ] as [keyof UserPermissions, string, string][]).map(([key, title, description]) => (
                      <label key={key} className={`flex items-start gap-2.5 rounded-lg border p-3 transition-colors ${workspaceUser.role === 'admin' ? 'cursor-default' : 'cursor-pointer'} ${workspacePermissions[key] ? 'border-violet-300 bg-violet-50/40' : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'}`}>
                        <input type="checkbox" checked={workspacePermissions[key]} disabled={workspaceUser.role === 'admin'} onChange={() => handleWorkspacePermissionChange(key)} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:cursor-not-allowed" />
                        <span>
                          <span className="block text-xs font-bold text-slate-800">{title}</span>
                          <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">{description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] text-slate-400">Ngày khởi tạo: <strong className="text-slate-600">{workspaceUser.createdAt}</strong></span>
                  {workspaceUser.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleOpenApproveModal(workspaceUser)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700">Duyệt tài khoản</button>
                      <button type="button" onClick={() => { setRejectingUser(workspaceUser); setRejectReason(''); }} className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100">Từ chối</button>
                    </div>
                  ) : workspaceUser.role === 'admin' ? (
                    <span className="rounded-xl bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700">Toàn quyền Admin được bảo vệ</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (workspaceUser.status === 'rejected') {
                            onApproveUser(workspaceUser.id, workspaceRole, workspacePermissions);
                            setStatusFilter('all');
                            return;
                          }
                          onUpdatePermissions(workspaceUser.id, workspaceRole, workspacePermissions);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-violet-700"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> {workspaceUser.status === 'rejected' ? 'Duyệt lại & cấp quyền' : 'Lưu cập nhật hồ sơ'}
                      </button>
                      {(workspaceUser.status === 'locked' || workspaceUser.status === 'rejected') && currentUser?.id !== workspaceUser.id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa tài khoản @${workspaceUser.username}?`)) {
                              onDeleteUser(workspaceUser.id);
                            }
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa tài khoản
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-80 items-center justify-center text-sm text-slate-400">Chọn một tài khoản để xem và phân quyền.</div>
            )}
          </div>
        </div>
      </section>

      {/* MODAL 1: DUYỆT & PHÂN QUYỀN TÀI KHOẢN */}
      {approvingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Phê Duyệt &amp; Cấp Quyền Đăng Nhập
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sau khi duyệt, người dùng có thể dùng tài khoản để đăng nhập vào hệ thống.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovingUser(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Applicant Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-base">{approvingUser.fullName}</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  @{approvingUser.username}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <div>
                  Email: <strong className="text-slate-800">{approvingUser.email}</strong>
                </div>
                <div>
                  Điện thoại: <strong className="text-slate-800">{approvingUser.phone}</strong>
                </div>
                <div>
                  Phòng ban: <strong className="text-slate-800">{approvingUser.department}</strong>
                </div>
                <div>
                  Ngày đăng ký: <strong className="text-slate-800">{approvingUser.createdAt}</strong>
                </div>
              </div>
              {approvingUser.registrationReason && (
                <div className="pt-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700">Mục đích yêu cầu: </span>
                  {approvingUser.registrationReason}
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Chọn Vai Trò Hệ Thống (Role)
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="hr_manager">Quản lý Nhân sự (HR Manager) - Toàn quyền hồ sơ &amp; báo cáo</option>
                <option value="media_manager">Quản lý Truyền thông (Media Manager) - Toàn quyền bài viết</option>
                <option value="admin">Quản trị viên cấp cao (Admin) - Toàn bộ các quyền</option>
              </select>
            </div>

            {/* Granular Permission Checkboxes */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  2. Chi Tiết Các Quyền Hạn Được Cấp
                </label>
                <span className="text-[11px] text-slate-400">Có thể tùy biến theo nhu cầu</span>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canViewDashboard}
                    onChange={() => handlePermissionCheckbox('canViewDashboard')}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Xem Bảng điều khiển tổng quan (Dashboard)</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canManageEmployees}
                    onChange={() => handlePermissionCheckbox('canManageEmployees')}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>Quản lý Nhân sự (Xem, thêm mới, sửa, xóa hồ sơ nhân viên)</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canManageMedia}
                    onChange={() => handlePermissionCheckbox('canManageMedia')}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <Newspaper className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quản lý Truyền thông (Xem, đăng bài viết, sửa, xóa tin tức)</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canManagePermissions}
                    onChange={() => handlePermissionCheckbox('canManagePermissions')}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Phân quyền &amp; Phê duyệt tài khoản (Toàn quyền quản trị)</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canExportData}
                    onChange={() => handlePermissionCheckbox('canExportData')}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất báo cáo dữ liệu danh sách nhân sự (CSV / Excel)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác Nhận Duyệt &amp; Cho Phép Đăng Nhập</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TỪ CHỐI TÀI KHOẢN */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Từ Chối Duyệt Tài Khoản</h3>
                <p className="text-xs text-slate-500">Người này sẽ không thể đăng nhập vào hệ thống</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Bạn đang từ chối yêu cầu đăng ký của <strong>{rejectingUser.fullName}</strong> (@
              {rejectingUser.username}).
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Lý do từ chối:</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Chưa có quyết định tuyển dụng, thông tin phòng ban không khớp..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CHỈNH SỬA QUYỀN ĐÃ DUYỆT */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Sliders className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Điều Chỉnh Phân Quyền: {editingPermissionsUser.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cập nhật lại quyền hạn truy cập của tài khoản @{editingPermissionsUser.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPermissionsUser(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Vai Trò (Role)
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="hr_manager">Quản lý Nhân sự (HR Manager)</option>
                <option value="media_manager">Quản lý Truyền thông (Media Manager)</option>
                <option value="admin">Quản trị viên cấp cao (Admin)</option>
              </select>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canViewDashboard}
                  onChange={() => handlePermissionCheckbox('canViewDashboard')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Xem Bảng điều khiển tổng quan (Dashboard)</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canManageEmployees}
                  onChange={() => handlePermissionCheckbox('canManageEmployees')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Quản lý Nhân sự (Xem, thêm mới, sửa, xóa hồ sơ nhân viên)</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canManageMedia}
                  onChange={() => handlePermissionCheckbox('canManageMedia')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Quản lý Truyền thông (Xem, đăng bài viết, sửa, xóa bài viết)</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canManagePermissions}
                  onChange={() => handlePermissionCheckbox('canManagePermissions')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Phân quyền &amp; Phê duyệt tài khoản (Admin)</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canExportData}
                  onChange={() => handlePermissionCheckbox('canExportData')}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Xuất dữ liệu Excel / CSV</span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPermissionsUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmEditPermissions}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
              >
                Lưu Thay Đổi Quyền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
