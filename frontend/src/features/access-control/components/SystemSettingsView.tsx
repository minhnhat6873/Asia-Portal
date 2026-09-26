import React, { useState } from 'react';
import { Role, SystemPermission, ModuleCategory, User, AuditLog } from '../types';
import type { Employee, MediaPost, TrashItem, UserAccount } from '@/app/(page)/admin/dashboard/types';
import EmployeeProfile from '@/app/(page)/employees/EmployeeProfile';
import type { Employee as EmployeeProfileData } from '@/types/employee';
import {
  ShieldCheck,
  PlusCircle,
  Layers,
  AlertCircle,
  Search,
  Check,
  Trash2,
  Edit3,
  Copy,
  Users,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  Shield,
  Filter,
  Lock,
  ExternalLink,
  X,
  RotateCcw,
  Eye,
} from 'lucide-react';

interface SystemSettingsViewProps {
  roles: Role[];
  permissions: SystemPermission[];
  modules: ModuleCategory[];
  users: User[];
  auditLogs: AuditLog[];
  trashItems: TrashItem[];
  initialActiveSubTab?: 'dashboard' | 'manage_roles' | 'create_role' | 'audit_logs';
  selectedRoleIdToView?: string | null;
  onCreateRole: (roleData: {
    name: string;
    code: string;
    description: string;
    color: string;
    permissionIds: string[];
  }) => void;
  onUpdateRolePermissions: (roleId: string, updatedPermissionIds: string[]) => void;
  onDeleteRole: (roleId: string) => void;
  onAssignUsersToRole: (roleId: string, userIds: string[]) => void;
  onNavigateToUserTab: () => void;
  onRestoreTrashItem: (item: TrashItem) => void;
  onPermanentlyDeleteTrashItem: (trashId: string) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  roles,
  permissions,
  modules,
  users,
  auditLogs,
  trashItems,
  initialActiveSubTab = 'dashboard',
  selectedRoleIdToView,
  onCreateRole,
  onUpdateRolePermissions,
  onDeleteRole,
  onAssignUsersToRole,
  onNavigateToUserTab,
  onRestoreTrashItem,
  onPermanentlyDeleteTrashItem,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'manage_roles' | 'create_role' | 'audit_logs'>(
    initialActiveSubTab
  );

  // Selected role to inspect ("khi bấm vào sẽ thấy có những quyền nào tôi đã gán vào cho nó")
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    selectedRoleIdToView || ''
  );

  // View mode inside role detail: 'only_assigned' or 'all_matrix'
  const [permissionViewFilter, setPermissionViewFilter] = useState<'assigned_only' | 'all'>('assigned_only');

  // Edit mode for current role
  const [isEditingRolePermissions, setIsEditingRolePermissions] = useState<boolean>(false);
  const [editingPermissionIds, setEditingPermissionIds] = useState<string[]>([]);

  // Search filter for created roles list
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [trashSearchQuery, setTrashSearchQuery] = useState('');
  const [trashTypeFilter, setTrashTypeFilter] = useState<'all' | TrashItem['entityType']>('all');
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
  const [trashDeleteTarget, setTrashDeleteTarget] = useState<TrashItem | 'all' | null>(null);
  const [trashEmployeeDetail, setTrashEmployeeDetail] = useState<Employee | null>(null);
  const [trashMediaDetail, setTrashMediaDetail] = useState<MediaPost | null>(null);

  // -------------------------------------------------------------
  // STATE FOR "TẠO QUYỀN" (User specifies Name + picks available permissions)
  // -------------------------------------------------------------
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('emerald');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [permModuleFilter, setPermModuleFilter] = useState<string>('all');
  const [formError, setFormError] = useState('');

  // Auto-generate code from name (trường Code đã bị xóa khỏi form)
  const generateCode = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 20);
  };

  const togglePermissionInCreate = (permId: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const selectAllPermissionsInCreate = () => {
    setSelectedPermissionIds(permissions.map((p) => p.id));
  };

  const deselectAllPermissionsInCreate = () => {
    setSelectedPermissionIds([]);
  };

  const toggleModuleInCreate = (moduleId: string) => {
    const modPermIds = permissions.filter((p) => p.module === moduleId).map((p) => p.id);
    const allSelected = modPermIds.every((id) => selectedPermissionIds.includes(id));

    if (allSelected) {
      setSelectedPermissionIds((prev) => prev.filter((id) => !modPermIds.includes(id)));
    } else {
      setSelectedPermissionIds((prev) => Array.from(new Set([...prev, ...modPermIds])));
    }
  };

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setFormError('Vui lòng nhập Tên quyền (VD: Quản lý Bar, Giám sát Ca, Kế toán Kho...)');
      return;
    }
    if (selectedPermissionIds.length === 0) {
      setFormError('Vui lòng gán ít nhất một quyền có sẵn cho nhóm quyền này.');
      return;
    }

    setFormError('');
    onCreateRole({
      name: newRoleName.trim(),
      code: generateCode(newRoleName.trim()) || 'ROLE_' + Date.now().toString().slice(-4),
      description: `Nhóm quyền ${newRoleName.trim()} vận hành hệ thống`,
      color: newRoleColor,
      permissionIds: selectedPermissionIds,
    });

    // Reset form and switch to Manage Roles tab to see the created role
    const createdName = newRoleName;
    setNewRoleName('');
    setSelectedPermissionIds([]);
    setActiveSubTab('manage_roles');
  };

  // -------------------------------------------------------------
  // INSPECTION & EDITING OF EXISTING CREATED ROLES
  // -------------------------------------------------------------
  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const usersWithSelectedRole = users.filter((u) => u.roleId === selectedRole?.id);

  const startEditingRole = (role: Role) => {
    setIsEditingRolePermissions(true);
    setEditingPermissionIds([...role.permissionIds]);
  };

  const saveEditingRole = () => {
    if (selectedRole) {
      onUpdateRolePermissions(selectedRole.id, editingPermissionIds);
      setIsEditingRolePermissions(false);
    }
  };

  const cancelEditingRole = () => {
    setIsEditingRolePermissions(false);
    setEditingPermissionIds([]);
  };

  const togglePermissionInEdit = (permId: string) => {
    setEditingPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const colorOptions = [
    { label: 'Xanh ngọc (Emerald)', value: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-400' },
    { label: 'Xanh dương (Blue)', value: 'blue', bg: 'bg-blue-500', text: 'text-blue-400' },
    { label: 'Hổ phách (Amber)', value: 'amber', bg: 'bg-amber-500', text: 'text-amber-400' },
    { label: 'Đỏ hồng (Rose)', value: 'rose', bg: 'bg-rose-500', text: 'text-rose-400' },
    { label: 'Tím hoa (Purple)', value: 'purple', bg: 'bg-purple-500', text: 'text-purple-400' },
    { label: 'Chàm đậm (Indigo)', value: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-400' },
  ];
  const selectedRoleColorClass = colorOptions.find((color) => color.value === newRoleColor)?.text ?? 'text-emerald-400';

  const filteredTrashItems = trashItems.filter((item) => {
    const matchesType = trashTypeFilter === 'all' || item.entityType === trashTypeFilter;
    const keyword = trashSearchQuery.trim().toLowerCase();
    return matchesType && (!keyword || item.title.toLowerCase().includes(keyword));
  });
  const isAllVisibleTrashSelected = filteredTrashItems.length > 0 && filteredTrashItems.every((item) => selectedTrashIds.includes(item.id));

  return (
    <div className="asia-access-control asia-system-settings space-y-6">
      {/* Top Header of System Settings */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            Cài đặt hệ thống · Quản trị phân quyền
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Cài đặt hệ thống & Quản lý nhóm quyền
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Tạo tên nhóm quyền mới để gán các quyền có sẵn trong hệ thống, xem và kiểm tra chi tiết các quyền đã được gán cho từng vai trò.
          </p>
          {activeSubTab !== 'dashboard' && (
            <button
              type="button"
              onClick={() => {
                setIsEditingRolePermissions(false);
                setSelectedRoleId('');
                setActiveSubTab('dashboard');
              }}
              className="mt-4 inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 transition-all hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-sm"
            >
              ← Quay về bảng điều khiển
            </button>
          )}
        </div>

        {/* Tab Navigator */}
        <div className="hidden">
          {activeSubTab !== 'dashboard' && (
            <button
              onClick={() => {
                setIsEditingRolePermissions(false);
                setSelectedRoleId('');
                setActiveSubTab('dashboard');
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              ← Bảng điều khiển
            </button>
          )}
          <button
            onClick={() => {
              setActiveSubTab('manage_roles');
              setIsEditingRolePermissions(false);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'manage_roles'
                ? 'bg-[#15803d] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Xem quản lý quyền đã tạo ({roles.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('create_role')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'create_role'
                ? 'bg-[#15803d] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            <span>Tạo quyền mới</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit_logs')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'audit_logs'
                ? 'bg-[#15803d] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Nhật ký</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setActiveSubTab('manage_roles')}
            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Layers className="h-5 w-5" />
            </span>
            <span className="mt-5 block text-base font-bold text-slate-900">Xem quyền đã tạo</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">Xem chi tiết nhóm quyền và các quyền đang được gán.</span>
            <span className="mt-5 inline-flex text-xs font-semibold text-emerald-700">Mở danh sách quyền →</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('create_role')}
            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <PlusCircle className="h-5 w-5" />
            </span>
            <span className="mt-5 block text-base font-bold text-slate-900">Tạo quyền mới</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">Tạo nhóm quyền mới từ danh mục quyền đã thiết lập.</span>
            <span className="mt-5 inline-flex text-xs font-semibold text-emerald-700">Tạo nhóm quyền →</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('audit_logs')}
            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Trash2 className="h-5 w-5" />
            </span>
            <span className="mt-5 block text-base font-bold text-slate-900">Thùng rác</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">Xem, khôi phục hoặc xóa vĩnh viễn các dữ liệu đã xóa.</span>
            <span className="mt-5 inline-flex text-xs font-semibold text-emerald-700">Mở thùng rác →</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 1: XEM & QUẢN LÝ NHỮNG QUYỀN ĐÃ TẠO                                */}
      {/* "khi bấm vào sẽ thấy có những quyền nào tôi đã gán vào cho nó"           */}
      {/* ========================================================================= */}
      {activeSubTab === 'manage_roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: List of Created Roles */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Danh sách quyền đã tạo</h2>
                <p className="text-xs text-slate-400">
                  Chọn một nhóm quyền để xem chi tiết các quyền đã gán
                </p>
              </div>
            </div>

            {/* Quick search roles */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm tên quyền đã tạo..."
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Roles list */}
            <div className="space-y-2.5">
              {roles
                .filter(
                  (r) =>
                    r.name.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
                    r.code.toLowerCase().includes(roleSearchQuery.toLowerCase())
                )
                .map((role) => {
                  const isSelected = role.id === selectedRole?.id;
                  const assignedCount = role.permissionIds.length;
                  const userCount = users.filter((u) => u.roleId === role.id).length;

                  return (
                    <div
                      key={role.id}
                      onClick={() => {
                        setSelectedRoleId(role.id);
                        setIsEditingRolePermissions(false);
                      }}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 shadow-md ring-1 ring-emerald-200'
                          : 'bg-slate-900/40 border-slate-800/80 hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                              role.color === 'emerald'
                                ? 'bg-emerald-400 ring-2 ring-emerald-950'
                                : role.color === 'blue'
                                ? 'bg-blue-400 ring-2 ring-blue-950'
                                : role.color === 'amber'
                                ? 'bg-amber-400 ring-2 ring-amber-950'
                                : role.color === 'rose'
                                ? 'bg-rose-400 ring-2 ring-rose-950'
                                : 'bg-purple-400 ring-2 ring-purple-950'
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-base leading-tight">{role.name}</h3>
                              {role.isSystemDefault && (
                                <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-semibold">
                                  Hệ thống
                                </span>
                              )}
                            </div>
                            <span className="mt-1 inline-flex text-xs font-mono text-slate-400">
                              {role.code}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-[66px] rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-center shrink-0">
                          <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums">
                            {assignedCount}/{permissions.length}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 block">quyền đã gán</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                        {role.description}
                      </p>

                      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            <strong className="text-slate-700">{userCount}</strong> nhân sự đang gán
                          </span>
                        </span>

                        <span
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                          }`}
                        >
                          {isSelected ? 'Đang xem' : 'Bấm để xem'}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Column: fixed detailed view */}
          {/* This is the core requirement: "khi bấm vào sẽ thấy có những quyền nào tôi đã gán vào cho nó" */}
          <div className="min-h-[36rem] space-y-6 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
            {selectedRole ? (
              <>
                {/* Detail Header */}
                <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-3.5 h-3.5 rounded-full ${
                          selectedRole.color === 'emerald'
                            ? 'bg-emerald-400'
                            : selectedRole.color === 'blue'
                            ? 'bg-blue-400'
                            : selectedRole.color === 'amber'
                            ? 'bg-amber-400'
                            : selectedRole.color === 'rose'
                            ? 'bg-rose-400'
                            : 'bg-purple-400'
                        }`}
                      />
                      <h2 className="text-xl font-bold text-emerald-950">{selectedRole.name}</h2>
                      {selectedRole.isSystemDefault && (
                        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          Quyền mặc định
                        </span>
                      )}
                    </div>
                    <p className="mt-1 max-w-xl text-xs text-slate-600">
                      {selectedRole.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4 font-mono text-xs text-slate-600">
                      <span>
                        Đã gán: <strong className="text-emerald-600">{selectedRole.permissionIds.length}</strong> / {permissions.length} quyền
                      </span>
                    </div>
                  </div>

                  {/* Actions for this role */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!isEditingRolePermissions ? (
                      <>
                        <button
                          onClick={() => startEditingRole(selectedRole)}
                          className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-xs font-semibold text-emerald-900 border border-emerald-300 rounded-xl transition-colors flex items-center gap-1.5"
                          title="Thêm hoặc bớt quyền cho nhóm này"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Sửa quyền gán</span>
                        </button>

                        {!selectedRole.isSystemDefault && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa nhóm quyền "${selectedRole.name}"?`)) {
                                onDeleteRole(selectedRole.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl border border-transparent hover:border-rose-900/50 transition-colors"
                            title="Xóa nhóm quyền này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelEditingRole}
                          className="px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-xl transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={saveEditingRole}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Lưu thay đổi
                        </button>
                      </div>
                    )}
                    {!isEditingRolePermissions && <button
                      type="button"
                      onClick={() => {
                        setIsEditingRolePermissions(false);
                        setSelectedRoleId('');
                      }}
                      className="rounded-xl border border-rose-300 bg-rose-50 p-2 text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700"
                      title="Đóng chi tiết quyền"
                      aria-label="Đóng chi tiết quyền"
                    >
                      <X className="h-4 w-4" />
                    </button>}
                  </div>
                </div>

                {isEditingRolePermissions && (
                  <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-rose-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        Đang ở chế độ chỉnh sửa: Bấm vào từng quyền có sẵn để bật/tắt gán cho nhóm này.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingPermissionIds(permissions.map((p) => p.id))}
                        className="rounded-md border border-emerald-400 bg-white px-2 py-1 font-semibold text-rose-700 hover:bg-emerald-50"
                      >
                        Chọn hết
                      </button>
                      <button
                        onClick={() => setEditingPermissionIds([])}
                        className="rounded-md border border-emerald-400 bg-white px-2 py-1 font-semibold text-rose-700 hover:bg-emerald-50"
                      >
                        Bỏ hết
                      </button>
                    </div>
                  </div>
                )}

                {/* List of Permissions Grouped By Module */}
                <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
                  {modules.map((mod) => {
                    const modPerms = permissions.filter((p) => p.module === mod.id);
                    const currentPermIds = isEditingRolePermissions
                      ? editingPermissionIds
                      : selectedRole.permissionIds;

                    const assignedInMod = modPerms.filter((p) => currentPermIds.includes(p.id));

                    // In view mode 'assigned_only', hide modules that have 0 assigned permissions
                    if (!isEditingRolePermissions && permissionViewFilter === 'assigned_only' && assignedInMod.length === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={mod.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800">
                              {mod.name}
                            </span>
                            <span className="hidden text-[10px] text-slate-500 sm:inline">· {mod.description}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
                          {modPerms.map((perm) => {
                            const isAssigned = currentPermIds.includes(perm.id);

                            if (!isEditingRolePermissions && permissionViewFilter === 'assigned_only' && !isAssigned) {
                              return null;
                            }

                            return (
                              <div
                                key={perm.id}
                                onClick={() => {
                                  if (isEditingRolePermissions) {
                                    togglePermissionInEdit(perm.id);
                                  }
                                }}
                                className={`flex items-start gap-3 rounded-xl border p-3 text-xs transition-all ${
                                  isEditingRolePermissions ? 'cursor-pointer hover:border-slate-600' : ''
                                } ${
                                  isAssigned
                                    ? 'border-slate-200 bg-white text-slate-800'
                                    : 'border-slate-200 bg-white text-slate-500'
                                }`}
                              >
                                <div className="order-2 mt-0.5 shrink-0">
                                  <div className={`flex h-5 w-9 items-center rounded-full p-0.5 shadow-inner ${isAssigned ? 'justify-end bg-emerald-700' : 'bg-slate-300'}`}>
                                    <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`font-semibold truncate ${
                                        isAssigned ? 'text-slate-800' : 'text-slate-700'
                                      }`}
                                    >
                                      {perm.name}
                                    </span>
                                    {perm.riskLevel === 'high' && (
                                      <span className="text-[10px] font-mono font-bold text-rose-500 shrink-0">
                                        Quan trọng
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-[10px] leading-snug text-slate-400">
                                    {perm.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Attached Users Preview */}
                <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
                  <div>
                    <span className="block text-xs text-slate-500">
                      Nhân sự đang sử dụng quyền này: <strong className="text-slate-800">{usersWithSelectedRole.length} người</strong>
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {usersWithSelectedRole.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Chưa có người dùng nào được gán</span>
                      ) : (
                        usersWithSelectedRole.slice(0, 5).map((u) => (
                          <span
                            key={u.id}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
                          >
                            {u.name}
                          </span>
                        ))
                      )}
                      {usersWithSelectedRole.length > 5 && (
                        <span className="text-[11px] text-slate-400">
                          +{usersWithSelectedRole.length - 5} người khác
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onNavigateToUserTab}
                    className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-slate-900 border border-emerald-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
                  >
                    <span>Xem & gán cho người dùng</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex min-h-[30rem] flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-6 text-center">
                <Layers className="mb-3 h-9 w-9 text-emerald-600" />
                <p className="text-base font-bold text-slate-700">Chọn một nhóm quyền để xem chi tiết</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Thông tin quyền được gán và nhân sự sử dụng sẽ hiển thị tại đây.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: TẠO QUYỀN MỚI (User specifies Name + assigns available perms)     */}
      {/* "trong đó sẽ có những quyền tôi đưa ra sẵn chỉ tạo Tên quyền để gán       */}
      {/* những quyền có sẵn"                                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'create_role' && (
        <form onSubmit={handleCreateRoleSubmit} className="space-y-6">
          {/* Top description card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Tạo nhóm quyền mới từ các quyền có sẵn
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                  Bạn chỉ cần nhập <strong className="text-white">Tên quyền</strong> (ví dụ: Tổ trưởng Bar, Quản lý kho, Kế toán chi nhánh...) và tích chọn các quyền có sẵn bên dưới để gán cho nhóm này. Nhóm quyền mới sẽ lập tức sẵn sàng để phân quyền cho nhân viên.
                </p>
              </div>

              <div className="text-right shrink-0 bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl">
                <span className="text-[11px] text-emerald-300 block font-medium">Đã chọn quyền</span>
                <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  {selectedPermissionIds.length} / {permissions.length}
                </span>
              </div>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Inputs: Tên quyền & Thông tin cơ bản */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tên quyền <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Quản lý Kho & Thu mua"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tên hiển thị khi phân quyền cho nhân sự
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Màu sắc nhận diện
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {colorOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewRoleColor(c.value)}
                      title={c.label}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                        newRoleColor === c.value
                          ? 'border-2 border-black scale-110'
                          : 'border-2 border-transparent opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  Màu huy hiệu hiển thị trên bảng phân quyền
                </span>
              </div>
            </div>


          </div>

          {/* Section: "NHỮNG QUYỀN TÔI ĐƯA RA SẴN ĐỂ GÁN" */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Danh sách quyền có sẵn trong hệ thống (Tích chọn để gán)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tích chọn các quyền chức năng bạn muốn phân bổ cho nhóm quyền này
                </p>
              </div>

              {/* Quick selectors */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllPermissionsInCreate}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  Chọn tất cả ({permissions.length})
                </button>
                <button
                  type="button"
                  onClick={deselectAllPermissionsInCreate}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            {/* Filter and search bar inside permission picker */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm quyền theo tên hoặc mã chức năng..."
                  value={permSearchQuery}
                  onChange={(e) => setPermSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={permModuleFilter}
                onChange={(e) => setPermModuleFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="all">Tất cả phân hệ ({modules.length})</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Permissions list grouped by Module */}
            <div className="space-y-3 pt-1">
              {modules
                .filter((m) => permModuleFilter === 'all' || m.id === permModuleFilter)
                .map((mod) => {
                  const modPerms = permissions.filter(
                    (p) =>
                      p.module === mod.id &&
                      (p.name.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
                        p.code.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
                        p.description.toLowerCase().includes(permSearchQuery.toLowerCase()))
                  );

                  if (modPerms.length === 0) return null;

                  const selectedInMod = modPerms.filter((p) =>
                    selectedPermissionIds.includes(p.id)
                  );
                  const isModAllSelected = selectedInMod.length === modPerms.length;

                  return (
                    <div
                      key={mod.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                        <div className="min-w-0"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-800">{mod.name}</span><span className="ml-2 hidden text-[10px] text-slate-500 sm:inline">· {mod.description}</span></div>
                        <button type="button" onClick={() => toggleModuleInCreate(mod.id)} className="shrink-0 text-[10px] font-medium text-slate-500 transition-colors hover:text-emerald-700">Bật / Tắt cả phân hệ</button>
                      </div>

                      {/* Permissions Grid */}
                      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
                        {modPerms.map((perm) => {
                          const isChecked = selectedPermissionIds.includes(perm.id);

                          return (
                            <label
                              key={perm.id}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={(event) => {
                                event.preventDefault();
                                const scrollContainer = event.currentTarget.closest('main');
                                const scrollTop = scrollContainer?.scrollTop ?? 0;
                                togglePermissionInCreate(perm.id);
                                requestAnimationFrame(() => {
                                  if (scrollContainer) scrollContainer.scrollTop = scrollTop;
                                });
                              }}
                              className={`perm-card flex cursor-pointer select-none items-start gap-3 rounded-xl border p-3 text-xs transition-all ${
                                isChecked
                                  ? 'border-slate-200 bg-white text-slate-800'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                tabIndex={-1}
                                className="pointer-events-none sr-only"
                              />
                              <div className="order-2 mt-0.5 shrink-0">
                                {isChecked ? (
                                  <div className="flex h-5 w-9 items-center justify-end rounded-full bg-emerald-700 p-0.5 shadow-inner">
                                    <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
                                  </div>
                                ) : (
                                  <div className="flex h-5 w-9 items-center rounded-full bg-slate-300 p-0.5"><span className="h-4 w-4 rounded-full bg-white shadow-sm" /></div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`font-bold ${
                                      isChecked ? 'text-slate-800' : 'text-slate-700'
                                    }`}
                                  >
                                    {perm.name}
                                  </span>
                                  {perm.riskLevel === 'high' && (
                                    <span className="text-[10px] font-mono font-bold text-rose-500 shrink-0">
                                      Quan trọng
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-[10px] leading-snug text-slate-400">
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Submit Action Bar */}
          <div className="bg-slate-900/95 border border-slate-700/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                Tên quyền: <strong className={`ml-1 font-bold ${selectedRoleColorClass}`}>{newRoleName || '(Chưa nhập)'}</strong>
              </span>
              <span>·</span>
              <span className="text-xs text-emerald-400 font-mono">
                {selectedPermissionIds.length} quyền được gán
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab('manage_roles')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#dc2626] hover:bg-[#b91c1c] rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-[#15803d] hover:bg-[#166534] text-white rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Lưu & Kích hoạt nhóm quyền này
              </button>
            </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: NHẬT KÝ PHÂN QUYỀN (AUDIT LOGS)                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit_logs' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <div>
              <h2 className="text-lg font-bold text-white">Thùng rác</h2>
              <p className="text-xs text-slate-400">Dữ liệu đã xóa được lưu tạm thời để bạn khôi phục khi cần.</p>
            </div>
          </div>

          {trashItems.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input value={trashSearchQuery} onChange={(event) => setTrashSearchQuery(event.target.value)} placeholder="Tìm dữ liệu đã xóa..." className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-emerald-500" />
              </div>
              <select value={trashTypeFilter} onChange={(event) => setTrashTypeFilter(event.target.value as 'all' | TrashItem['entityType'])} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500">
                <option value="all">Tất cả quản lý</option>
                <option value="employee">Quản lý nhân sự</option>
                <option value="media">Quản lý truyền thông</option>
                <option value="role">Nhóm quyền</option>
              </select>
              <button type="button" onClick={() => setSelectedTrashIds(isAllVisibleTrashSelected ? [] : filteredTrashItems.map((item) => item.id))} className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                {isAllVisibleTrashSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
              <button type="button" onClick={() => setTrashDeleteTarget('all')} className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
                Xóa tất cả
              </button>
            </div>
          )}

          {trashItems.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <Trash2 className="h-9 w-9 text-slate-400" />
              <p className="mt-3 text-sm font-bold text-slate-700">Thùng rác đang trống</p>
              <p className="mt-1 text-xs text-slate-500">Nhân sự, truyền thông, tài khoản và nhóm quyền đã xóa sẽ hiển thị tại đây.</p>
            </div>
          ) : filteredTrashItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Không tìm thấy dữ liệu phù hợp.</div>
          ) : (
            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {filteredTrashItems.map((item, index) => {
                const isSelected = selectedTrashIds.includes(item.id);
                const employee = item.entityType === 'employee' ? item.payload as Employee : null;
                const mediaPost = item.entityType === 'media' ? item.payload as MediaPost : null;
                const account = (item.entityType === 'account' || item.entityType === 'access_user') ? item.payload as UserAccount | User : null;
                const role = item.entityType === 'role' ? item.payload as Role : null;
                const roleHasCriticalPermission = !!role?.permissionIds.some((permissionId) => permissions.find((permission) => permission.id === permissionId)?.riskLevel === 'high');
                const secondaryText = employee ? employee.department : mediaPost ? `${mediaPost.title} · ${mediaPost.authorDepartment}` : account ? `${'username' in account ? account.username : account.name} · ${account.email}` : roleHasCriticalPermission ? 'Quan trọng' : '';
                return (
                <div key={`${item.id}-${index}`} onClick={() => setSelectedTrashIds((ids) => isSelected ? ids.filter((id) => id !== item.id) : [...ids, item.id])} className={`flex cursor-pointer flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${isSelected ? 'bg-rose-50 ring-1 ring-inset ring-rose-200' : 'hover:bg-slate-50'}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 bg-white text-transparent'}`}><Check className="h-3.5 w-3.5" /></span>
                    {employee || mediaPost ? (
                      <img src={employee ? employee.avatar : mediaPost!.coverImage} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 className="h-5 w-5" /></span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{item.title}</p>
                      {secondaryText && <p className="mt-0.5 truncate text-xs text-slate-500">{secondaryText}</p>}
                      <p className="mt-0.5 text-xs text-slate-500">{({ employee: 'Nhân sự', media: 'Truyền thông', account: 'Tài khoản', access_user: 'Tài khoản phân quyền', role: 'Nhóm quyền' } as const)[item.entityType]} · Đã xóa {item.deletedAt} · Người xóa: {item.deletedBy || 'chưa có dữ liệu'}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {employee && <button type="button" onClick={(event) => { event.stopPropagation(); setTrashEmployeeDetail(employee); }} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Eye className="h-3.5 w-3.5" />Xem chi tiết</button>}
                    {mediaPost && <button type="button" onClick={(event) => { event.stopPropagation(); setTrashMediaDetail(mediaPost); }} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Eye className="h-3.5 w-3.5" />Xem chi tiết</button>}
                    <button type="button" onClick={(event) => { event.stopPropagation(); onRestoreTrashItem(item); setSelectedTrashIds((ids) => ids.filter((id) => id !== item.id)); }} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"><RotateCcw className="h-3.5 w-3.5" />Khôi phục</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setTrashDeleteTarget(item); }} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" />Xóa</button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {trashEmployeeDetail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={() => setTrashEmployeeDetail(null)}>
          <section role="dialog" aria-modal="true" aria-label="Hồ sơ nhân viên đã xóa" className="w-full max-w-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex justify-end"><button type="button" onClick={() => setTrashEmployeeDetail(null)} className="rounded-full bg-white p-2 text-slate-600 shadow hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <EmployeeProfile employee={{
              id: trashEmployeeDetail.id,
              employeeCode: trashEmployeeDetail.code,
              name: trashEmployeeDetail.fullName,
              position: trashEmployeeDetail.position,
              department: trashEmployeeDetail.department,
              email: trashEmployeeDetail.email,
              phone: trashEmployeeDetail.phone,
              location: trashEmployeeDetail.location,
              avatar: trashEmployeeDetail.avatar,
              joinDate: trashEmployeeDetail.joinDate,
              status: trashEmployeeDetail.status === 'inactive' ? 'inactive' : 'active',
              description: trashEmployeeDetail.bio,
            } satisfies EmployeeProfileData} />
          </section>
        </div>
      )}

      {trashMediaDetail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={() => setTrashMediaDetail(null)}>
          <section role="dialog" aria-modal="true" aria-label="Bài viết truyền thông đã xóa" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <img src={trashMediaDetail.coverImage} alt={trashMediaDetail.title} className="h-64 w-full object-cover" />
            <div className="space-y-4 p-6"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-rose-800 px-3 py-1 text-xs font-bold text-white">{trashMediaDetail.category}</span><button type="button" onClick={() => setTrashMediaDetail(null)} className="text-slate-500 hover:text-slate-800"><X className="h-5 w-5" /></button></div><h2 className="text-2xl font-black text-slate-900">{trashMediaDetail.title}</h2><p className="text-sm text-slate-500">{trashMediaDetail.summary}</p><p className="text-sm text-slate-400">{trashMediaDetail.publishDate} · {trashMediaDetail.authorDepartment}</p><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950 whitespace-pre-line">{trashMediaDetail.content}</div><p className="text-xs text-slate-400">Trạng thái: <strong>{trashMediaDetail.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</strong></p></div>
          </section>
        </div>
      )}

      {trashDeleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/15 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" aria-labelledby="permanent-delete-title" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><AlertCircle className="h-5 w-5" /></span>
              <div>
                <h2 id="permanent-delete-title" className="text-base font-bold text-slate-900">Xóa dữ liệu vĩnh viễn?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{trashDeleteTarget === 'all' ? `Bạn sắp xóa vĩnh viễn toàn bộ ${trashItems.length} mục trong Thùng rác.` : `Bạn sắp xóa vĩnh viễn “${trashDeleteTarget.title}”.`} <strong className="font-semibold text-rose-600">Dữ liệu sẽ mất vĩnh viễn và không thể khôi phục.</strong></p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setTrashDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Hủy</button>
              <button type="button" onClick={() => { if (trashDeleteTarget === 'all') { trashItems.forEach((item) => onPermanentlyDeleteTrashItem(item.id)); setSelectedTrashIds([]); } else { onPermanentlyDeleteTrashItem(trashDeleteTarget.id); setSelectedTrashIds((ids) => ids.filter((id) => id !== trashDeleteTarget.id)); } setTrashDeleteTarget(null); }} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"><Trash2 className="h-4 w-4" />Xóa vĩnh viễn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
