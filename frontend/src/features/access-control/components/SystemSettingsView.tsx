import React, { useState } from 'react';
import { Role, SystemPermission, ModuleCategory, User, AuditLog } from '../types';
import type { Employee, MediaPost, TrashItem, UserAccount } from '@/features/admin/dashboard/types';
import EmployeeProfile from '@/features/employees/components/EmployeeProfile';
import type { Employee as EmployeeProfileData } from '@/types/employee';
import {
  ShieldCheck,
  PlusCircle,
  Layers,
  UserRound,
  AlertCircle,
  Search,
  Check,
  Trash2,
  Edit3,
  Copy,
  Users,
  Newspaper,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
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
  Image as ImageIcon,
  Files,
  BriefcaseBusiness,
  Settings,
  Cloud,
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
  onNavigateToRoles?: () => void;
  onNavigateToCreateRole?: () => void;
  onRestoreTrashItem: (item: TrashItem) => void | Promise<void>;
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
  onNavigateToRoles,
  onNavigateToCreateRole,
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
  const [roleStatusFilter, setRoleStatusFilter] = useState<'all' | 'active' | 'unused' | 'inactive'>('all');
  const [rolePage, setRolePage] = useState(1);
  const [rolePageSize, setRolePageSize] = useState(10);
  const [trashSearchQuery, setTrashSearchQuery] = useState('');
  const [trashTypeFilter, setTrashTypeFilter] = useState<'all' | TrashItem['entityType']>('all');
  const [trashEntityTab, setTrashEntityTab] = useState<'accounts' | 'roles'>('accounts');
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
  const [trashDeleteTarget, setTrashDeleteTarget] = useState<TrashItem | 'all' | null>(null);
  const [trashEmployeeDetail, setTrashEmployeeDetail] = useState<Employee | null>(null);
  const [trashMediaDetail, setTrashMediaDetail] = useState<MediaPost | null>(null);

  // -------------------------------------------------------------
  // STATE FOR "TẠO QUYỀN" (User specifies Name + picks available permissions)
  // -------------------------------------------------------------
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('emerald');
  const [newRoleIcon, setNewRoleIcon] = useState('shield');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>(() => modules.slice(0, 1).map((module) => module.id));
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
      description: newRoleDescription.trim() || `Nhóm quyền ${newRoleName.trim()} vận hành hệ thống`,
      color: newRoleColor,
      permissionIds: selectedPermissionIds,
    });

    // Reset form and switch to Manage Roles tab to see the created role
    const createdName = newRoleName;
    setNewRoleName('');
    setNewRoleDescription('');
    setSelectedPermissionIds([]);
    if (onNavigateToRoles) {
      onNavigateToRoles();
    } else {
      setActiveSubTab('manage_roles');
    }
  };

  // -------------------------------------------------------------
  // INSPECTION & EDITING OF EXISTING CREATED ROLES
  // -------------------------------------------------------------
  const inactiveRoleItems = trashItems.filter((item) => item.entityType === 'role');
  const inactiveRoles = inactiveRoleItems.map((item) => item.payload as Role);
  const allRoleRows = [...roles, ...inactiveRoles.filter((inactiveRole) => !roles.some((role) => role.id === inactiveRole.id))];
  const selectedRole = allRoleRows.find((role) => role.id === selectedRoleId);
  const filteredRoleRows = allRoleRows.filter((role) => {
    const search = roleSearchQuery.trim().toLowerCase();
    const userCount = users.filter((user) => user.roleId === role.id).length;
    const isInactive = inactiveRoles.some((inactiveRole) => inactiveRole.id === role.id);
    const status = isInactive ? 'inactive' : userCount > 0 ? 'active' : 'unused';
    return (!search || role.name.toLowerCase().includes(search) || role.code.toLowerCase().includes(search)) && (roleStatusFilter === 'all' || status === roleStatusFilter);
  });
  const rolePageCount = Math.max(1, Math.ceil(filteredRoleRows.length / rolePageSize));
  const safeRolePage = Math.min(rolePage, rolePageCount);
  const pageRoles = filteredRoleRows.slice((safeRolePage - 1) * rolePageSize, safeRolePage * rolePageSize);
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

  const filteredTrashItems = trashItems.filter((item) => {
    const isAccount = item.entityType === 'account' || item.entityType === 'access_user';
    const matchesTab = trashEntityTab === 'accounts' ? isAccount : item.entityType === 'role';
    const matchesType = trashTypeFilter === 'all' || item.entityType === trashTypeFilter;
    const keyword = trashSearchQuery.trim().toLowerCase();
    return matchesTab && matchesType && (!keyword || item.title.toLowerCase().includes(keyword));
  });

  return (
    <div className="asia-access-control asia-system-settings space-y-6">
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Tổng nhóm quyền', value: allRoleRows.length, tone: 'bg-emerald-50 text-emerald-700', Icon: Layers },
              { label: 'Đang sử dụng', value: roles.filter((role) => users.some((user) => user.roleId === role.id)).length, tone: 'bg-emerald-50 text-emerald-700', Icon: ShieldCheck },
              { label: 'Chưa sử dụng', value: roles.filter((role) => !users.some((user) => user.roleId === role.id)).length, tone: 'bg-amber-50 text-amber-700', Icon: Clock },
              { label: 'Đã vô hiệu hóa', value: inactiveRoles.length, tone: 'bg-rose-50 text-rose-700', Icon: Lock },
            ].map(({ label, value, tone, Icon }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}><Icon className="h-4 w-4" /></span><div><p className="text-[10px] text-slate-500">{label}</p><p className="text-xl font-bold text-slate-900">{value}</p></div></div>)}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm md:flex-row md:items-center">
            <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={roleSearchQuery} onChange={(event) => { setRoleSearchQuery(event.target.value); setRolePage(1); }} placeholder="Tìm theo tên nhóm quyền, mô tả..." className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-emerald-500" /></div>
            <select value={roleStatusFilter} onChange={(event) => { setRoleStatusFilter(event.target.value as typeof roleStatusFilter); setRolePage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"><option value="all">Tất cả trạng thái</option><option value="active">Đang sử dụng</option><option value="unused">Chưa sử dụng</option><option value="inactive">Đã vô hiệu hóa</option></select>
            <button type="button" onClick={() => { setRoleSearchQuery(''); setRoleStatusFilter('all'); setRolePage(1); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" />Đặt lại</button>
            <button type="button" onClick={() => onNavigateToCreateRole ? onNavigateToCreateRole() : setActiveSubTab('create_role')} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"><PlusCircle className="h-4 w-4" />Tạo nhóm quyền</button>
            <button type="button" onClick={() => setRoleStatusFilter('inactive')} title="Xem nhóm quyền đã vô hiệu hóa" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><MoreVertical className="h-4 w-4" /></button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Tên nhóm quyền</th><th className="px-3 py-3">Mô tả</th><th className="px-3 py-3">Số tài khoản</th><th className="px-3 py-3">Số quyền</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Ngày tạo</th><th className="px-3 py-3 text-center">Thao tác</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRoles.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-slate-400">Không tìm thấy nhóm quyền phù hợp.</td></tr> : pageRoles.map((role) => {
                    const userCount = users.filter((user) => user.roleId === role.id).length;
                    const inactiveItem = inactiveRoleItems.find((item) => (item.payload as Role).id === role.id);
                    const status = inactiveItem ? 'inactive' : userCount > 0 ? 'active' : 'unused';
                    const statusLabel = status === 'inactive' ? 'Đã vô hiệu hóa' : status === 'active' ? 'Đang sử dụng' : 'Chưa sử dụng';
                    return <tr key={role.id} className="hover:bg-emerald-50/40">
                      <td className="px-3 py-2.5"><button type="button" onClick={() => { setSelectedRoleId(role.id); setIsEditingRolePermissions(false); }} className="flex items-center gap-2 text-left font-semibold text-slate-800 hover:text-emerald-800"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 text-rose-600"><ShieldCheck className="h-3.5 w-3.5" /></span>{role.name}</button></td>
                      <td className="max-w-48 truncate px-3 py-2.5 text-slate-500">{role.description}</td><td className="px-3 py-2.5 text-slate-600">{userCount}</td><td className="px-3 py-2.5 text-slate-600">{role.permissionIds.length}</td>
                      <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${status === 'active' ? 'bg-emerald-100 text-emerald-800' : status === 'unused' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>{statusLabel}</span></td>
                      <td className="px-3 py-2.5 text-slate-500">{role.createdAt ? new Date(role.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                      <td className="px-3 py-2.5"><div className="flex items-center justify-center gap-1"><button type="button" title="Xem quyền" aria-label={`Xem ${role.name}`} onClick={() => { setSelectedRoleId(role.id); setIsEditingRolePermissions(false); }} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><Edit3 className="h-3.5 w-3.5" /></button><button type="button" title="Chỉnh sửa quyền" aria-label={`Chỉnh sửa ${role.name}`} onClick={() => { setSelectedRoleId(role.id); startEditingRole(role); }} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><Edit3 className="h-3.5 w-3.5" /></button>{inactiveItem ? <button type="button" title="Xóa vĩnh viễn" aria-label={`Xóa vĩnh viễn ${role.name}`} onClick={() => setTrashDeleteTarget(inactiveItem)} className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button> : !role.isSystemDefault && <button type="button" title="Chuyển vào thùng rác" aria-label={`Xóa ${role.name}`} onClick={() => { if (confirm(`Chuyển nhóm quyền “${role.name}” vào thùng rác?`)) onDeleteRole(role.id); }} className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>}</div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5 text-[10px] text-slate-500"><span>Hiển thị {filteredRoleRows.length ? (safeRolePage - 1) * rolePageSize + 1 : 0} - {Math.min(safeRolePage * rolePageSize, filteredRoleRows.length)} trong tổng số {filteredRoleRows.length} nhóm quyền</span><div className="flex items-center gap-1.5"><button type="button" disabled={safeRolePage <= 1} onClick={() => setRolePage((page) => Math.max(1, page - 1))} className="rounded-md border border-slate-200 p-1 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button><span className="rounded-md bg-emerald-700 px-2.5 py-1.5 font-bold text-white">{safeRolePage}</span><button type="button" disabled={safeRolePage >= rolePageCount} onClick={() => setRolePage((page) => Math.min(rolePageCount, page + 1))} className="rounded-md border border-slate-200 p-1 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button><select value={rolePageSize} onChange={(event) => { setRolePageSize(Number(event.target.value)); setRolePage(1); }} className="ml-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"><option value={10}>10 / trang</option><option value={20}>20 / trang</option></select></div></div>
          </div>

          {/* Right Column: fixed detailed view */}
          {/* This is the core requirement: "khi bấm vào sẽ thấy có những quyền nào tôi đã gán vào cho nó" */}
          <div className={`min-h-[28rem] space-y-6 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-12 ${selectedRole ? '' : 'hidden'}`}>
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
        <form onSubmit={handleCreateRoleSubmit} className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
          {/* Top description card */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Thông tin nhóm quyền</h2>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Inputs: Tên quyền & Thông tin cơ bản */}
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Tên nhóm quyền <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên nhóm quyền..."
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition-colors focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Mô tả</label>
                <textarea value={newRoleDescription} onChange={(event) => setNewRoleDescription(event.target.value)} rows={3} placeholder="Nhập mô tả về nhóm quyền..." className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">Màu sắc hiển thị <span className="text-rose-500">*</span></p>
                <div className="flex flex-wrap items-center gap-3">{([{ name: 'emerald', className: 'bg-emerald-500' }, { name: 'blue', className: 'bg-blue-500' }, { name: 'purple', className: 'bg-purple-500' }, { name: 'orange', className: 'bg-orange-500' }, { name: 'red', className: 'bg-rose-500' }, { name: 'pink', className: 'bg-pink-500' }, { name: 'slate', className: 'bg-slate-400' }] as const).map(({ name, className }) => <button key={name} type="button" aria-label={`Chọn màu ${name}`} aria-pressed={newRoleColor === name} onClick={() => setNewRoleColor(name)} className={`h-6 w-6 rounded-full ${className} ${newRoleColor === name ? 'ring-2 ring-white ring-offset-2 ring-offset-emerald-600' : ''}`} />)}</div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">Icon</p>
                <div className="flex flex-wrap gap-1.5">{[{ id: 'shield', Icon: Shield }, { id: 'users', Icon: Users }, { id: 'calendar', Icon: CalendarDays }, { id: 'image', Icon: ImageIcon }, { id: 'files', Icon: Files }, { id: 'briefcase', Icon: BriefcaseBusiness }, { id: 'settings', Icon: Settings }, { id: 'cloud', Icon: Cloud }].map(({ id, Icon }) => <button key={id} type="button" aria-label={`Chọn biểu tượng ${id}`} aria-pressed={newRoleIcon === id} onClick={() => setNewRoleIcon(id)} className={`flex h-9 w-9 items-center justify-center rounded-lg border ${newRoleIcon === id ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Icon className="h-4 w-4" /></button>)}</div>
              </div>
            </div>


          </div>

          {/* Section: "NHỮNG QUYỀN TÔI ĐƯA RA SẴN ĐỂ GÁN" */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Chọn quyền cho nhóm</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">Chọn các quyền mà nhóm này sẽ được sử dụng</p>
              </div>

              {/* Quick selectors */}
              <label className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-slate-600"><input type="checkbox" checked={selectedPermissionIds.length === permissions.length && permissions.length > 0} onChange={(event) => event.target.checked ? selectAllPermissionsInCreate() : deselectAllPermissionsInCreate()} className="h-4 w-4 rounded border-slate-300 accent-emerald-700" />Chọn tất cả</label>
            </div>

            {/* Permissions list grouped by Module */}
            <div className="max-h-[340px] space-y-2 overflow-y-auto pt-1 pr-1">
              {modules
                .map((mod) => {
                  const modPerms = permissions.filter((permission) => permission.module === mod.id);

                  if (modPerms.length === 0) return null;
                  const selectedInMod = modPerms.filter((p) =>
                    selectedPermissionIds.includes(p.id)
                  );
                  const isModAllSelected = selectedInMod.length === modPerms.length;
                  const isExpanded = expandedModuleIds.includes(mod.id);
                  const ModuleIcon =
                    mod.id === 'accounts'
                      ? UserRound
                      : mod.id === 'roles'
                        ? Layers
                        : mod.id === 'employees'
                          ? Users
                          : mod.id === 'media'
                            ? Newspaper
                            : mod.id === 'meetings'
                              ? CalendarDays
                            : ShieldCheck;

                  return (
                    <div key={mod.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <div className="flex min-h-9 items-center gap-2 bg-slate-50 px-2.5">
                        <input type="checkbox" checked={isModAllSelected} onChange={() => setSelectedPermissionIds((ids) => isModAllSelected ? ids.filter((id) => !modPerms.some((perm) => perm.id === id)) : [...new Set([...ids, ...modPerms.map((perm) => perm.id)])])} aria-label={`Chọn tất cả quyền ${mod.name}`} className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-700" />
                        <button type="button" onClick={() => setExpandedModuleIds((items) => items.includes(mod.id) ? items.filter((id) => id !== mod.id) : [...items, mod.id])} className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1.5 text-left">
                          <span className="flex min-w-0 items-center gap-2"><ModuleIcon className="h-3.5 w-3.5 shrink-0 text-emerald-700" /><span className="truncate text-[11px] font-semibold text-slate-800">{mod.name}</span><span className="shrink-0 text-[10px] text-slate-500">({modPerms.length} quyền)</span></span>
                          <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-emerald-700 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </div>
                      {/* Permissions Grid */}
                      {isExpanded && (
                        <div className="ml-5 border-l border-emerald-100 pl-3 pr-2">
                        {modPerms.map((perm) => {
                          const isChecked = selectedPermissionIds.includes(perm.id);

                          return (
                            <label key={perm.id} className="flex min-h-7 cursor-pointer items-center gap-2 border-b border-slate-100 py-1 text-[10px] text-slate-700 last:border-b-0"><input type="checkbox" checked={isChecked} onChange={() => togglePermissionInCreate(perm.id)} className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-emerald-700" /><span>{perm.name}</span></label>
                          );
                        })}
                      </div>
                      )}
                    </div>
                  );
                })}
            </div>

          </div>

          {/* Submit Action Bar */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3 lg:col-span-2">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { setNewRoleName(''); setNewRoleDescription(''); setSelectedPermissionIds([]); onNavigateToRoles?.(); }} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Hủy</button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                <Check className="w-4 h-4" />
                Tạo nhóm quyền
              </button>
            </div>
            </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: NHẬT KÝ PHÂN QUYỀN (AUDIT LOGS)                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit_logs' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Thùng rác</h2>
              <p className="text-xs text-slate-400">Dữ liệu đã xóa được lưu tạm thời để bạn khôi phục khi cần.</p>
            </div>
          </div>

          <div className="flex gap-2 border-b border-slate-200">
            {([{ id: 'accounts', label: `Tài khoản (${trashItems.filter((item) => item.entityType === 'account' || item.entityType === 'access_user').length})` }, { id: 'roles', label: `Nhóm quyền (${trashItems.filter((item) => item.entityType === 'role').length})` }] as const).map((tab) => <button key={tab.id} type="button" onClick={() => setTrashEntityTab(tab.id)} className={`rounded-t-xl px-4 py-2 text-xs font-bold ${trashEntityTab === tab.id ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>{tab.label}</button>)}
          </div>

          {filteredTrashItems.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input value={trashSearchQuery} onChange={(event) => setTrashSearchQuery(event.target.value)} placeholder="Tìm dữ liệu đã xóa..." className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-emerald-500" />
              </div>
              <select value={trashTypeFilter} onChange={(event) => setTrashTypeFilter(event.target.value as 'all' | TrashItem['entityType'])} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500">
                <option value="all">Tất cả loại</option>
                <option value="account">Tài khoản</option>
                <option value="access_user">Tài khoản phân quyền</option>
                <option value="role">Nhóm quyền</option>
              </select>
            </div>
          )}

          {filteredTrashItems.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <Trash2 className="h-9 w-9 text-slate-400" />
              <p className="mt-3 text-sm font-bold text-slate-700">{trashItems.length ? 'Không tìm thấy dữ liệu phù hợp' : 'Thùng rác đang trống'}</p>
              <p className="mt-1 text-xs text-slate-500">Tài khoản và nhóm quyền đã xóa sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500"><tr><th className="px-3 py-3">Loại</th><th className="px-3 py-3">Thông tin</th><th className="px-3 py-3">Người thực hiện</th><th className="px-3 py-3">Thời gian xóa</th><th className="px-3 py-3">Lý do xóa</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
              {filteredTrashItems.map((item, index) => {
                const employee = item.entityType === 'employee' ? item.payload as Employee : null;
                const mediaPost = item.entityType === 'media' ? item.payload as MediaPost : null;
                const account = (item.entityType === 'account' || item.entityType === 'access_user') ? item.payload as UserAccount | User : null;
                const role = item.entityType === 'role' ? item.payload as Role : null;
                const roleHasCriticalPermission = !!role?.permissionIds.some((permissionId) => permissions.find((permission) => permission.id === permissionId)?.riskLevel === 'high');
                const secondaryText = employee ? employee.department : mediaPost ? `${mediaPost.title} · ${mediaPost.authorDepartment}` : account ? `${'username' in account ? account.username : account.name} · ${account.email}` : roleHasCriticalPermission ? 'Quan trọng' : '';
                return (
                <tr key={`${item.id}-${index}`} className="hover:bg-slate-50">
                  <td className="px-3 py-3 text-slate-500">{item.entityType === 'role' ? 'Nhóm quyền' : 'Tài khoản'}</td>
                  <td className="px-3 py-3"><span className="font-semibold text-slate-800">{item.title}</span>{secondaryText && <span className="mt-1 block text-[11px] text-slate-500">{secondaryText}</span>}</td>
                  <td className="px-3 py-3 text-slate-500">{item.deletedBy || 'Quản trị viên'}</td>
                  <td className="px-3 py-3 text-slate-500">{item.deletedAt}</td><td className="px-3 py-3 text-slate-500">{item.entityType === 'role' ? 'Ngừng sử dụng' : 'Không còn sử dụng'}</td>
                  <td className="px-3 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={async (event) => { event.stopPropagation(); await onRestoreTrashItem(item); setSelectedTrashIds((ids) => ids.filter((id) => id !== item.id)); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2.5 py-1.5 font-bold text-emerald-800 hover:bg-emerald-50"><RotateCcw className="h-3.5 w-3.5" />Khôi phục</button><button type="button" onClick={(event) => { event.stopPropagation(); setTrashDeleteTarget(item); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1.5 font-bold text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Xóa vĩnh viễn</button></div></td>
                </tr>
                );
              })}
              </tbody>
            </table>
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
