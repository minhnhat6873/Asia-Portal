"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserManagementView, type AccountAccess } from "./components/UserManagementView";
import { SystemSettingsView } from "./components/SystemSettingsView";
import { PermissionGroupForm } from "./components/PermissionGroupForm";
import { CreateAccountPage } from "./components/CreateAccountPage";
import type { ModuleCategory, Role, SystemPermission, User } from "./types";
import {
  createAccount, deleteAccount, createPermissionGroup, deletePermissionGroup, getAccounts, getPermissionCatalog, getPermissionGroups,
  updateAccount, updatePermissionGroup, type ApiAccount, type ApiPermissionGroup, type PermissionAction,
} from "@/services/access-control.service";
import { getAdminSession } from "@/lib/adminSession";

type AccessControlTab = "permissions" | "system-settings";
export type AccessControlPage = "overview" | "accounts" | "new-account" | "roles" | "new-role" | "edit-role";
interface AccessControlTabsProps {
  page: AccessControlPage;
  onNavigateToPage: (page: Exclude<AccessControlPage, "edit-role">) => void;
  editingRoleId?: string;
  onNavigateToEditRole: (roleId: string) => void;
  activeTab: AccessControlTab;
  onAccountsChanged?: (pendingCount: number) => void;
}

function toRole(group: ApiPermissionGroup): Role {
  return {
    id: group.id, name: group.name, status: group.status, code: group.id,
    description: group.description ?? "", color: group.color ?? "emerald", icon: group.icon ?? "shield", permissionIds: group.actions,
    createdAt: group.createdAt ?? "", updatedAt: group.updatedAt ?? "",
  };
}

function toUser(account: ApiAccount): User {
  return {
    id: account.id, name: account.name, email: account.email, phone: account.phone ?? "",
    accountRole: account.role, roleIds: account.permissionGroupIds,
    status: account.status === "inactive" ? "suspended" : account.status,
    createdAt: account.createdAt ? new Date(account.createdAt).toLocaleDateString("vi-VN") : "",
  };
}

export function AccessControlTabs({ activeTab, page, editingRoleId, onNavigateToEditRole, onNavigateToPage, onAccountsChanged }: AccessControlTabsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<ModuleCategory[]>([]);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const [accounts, groups, catalog] = await Promise.all([getAccounts(), getPermissionGroups(), getPermissionCatalog()]);
    setUsers(accounts.map(toUser)); setRoles(groups.map(toRole));
    setModules(catalog.modules); setPermissions(catalog.permissions); setLoadError("");
    onAccountsChanged?.(accounts.filter((account) => account.status === "pending").length);
  }, [onAccountsChanged]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (!active) return; void reload().catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu phân quyền."); })
      .finally(() => { if (active) setIsLoading(false); }); });
    return () => { active = false; };
  }, [reload]);

  const mutate = async (action: () => Promise<unknown>, success: string, propagateError = false): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);
    try {
      await action(); await reload(); toast.success(success); return true;
    } catch (error) {
      if (propagateError) throw error;
      toast.error(error instanceof Error ? error.message : "Không thể lưu thay đổi."); return false;
    } finally { setSaving(false); }
  };

  const saveAccountAccess = (userId: string, access: AccountAccess) => {
    return mutate(() => updateAccount(userId, {
      role: access.accountRole,
      status: access.status === "suspended" ? "inactive" : "active", permissionGroupIds: access.accountRole === "admin" ? [] : access.roleIds,
    }), "Đã cập nhật loại tài khoản, trạng thái và nhóm quyền.");
  };

  if (isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải dữ liệu phân quyền...</div>;
  if (loadError) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{loadError}<button type="button" onClick={() => void reload().catch((error: Error) => setLoadError(error.message))} className="ml-3 font-bold underline">Thử lại</button></div>;

  if (page === "new-account") return <CreateAccountPage
    roles={roles.filter((role) => role.status === "active")}
    onCancel={() => onNavigateToPage("accounts")}
    onSave={(user) => mutate(() => createAccount({
      name: user.name, email: user.email, password: user.password, confirmPassword: user.confirmPassword, phone: user.phone,
      role: user.accountRole, permissionGroupIds: user.accountRole === "admin" ? [] : user.roleIds,
    }), "Đã tạo tài khoản.", true)}
  />;

  if (activeTab === "permissions" && page === "accounts") return <UserManagementView
    users={users} roles={roles}
    currentUserId={getAdminSession()?.id ?? ""} saving={saving}
    canManageAccountTypes={getAdminSession()?.role === "Toàn quyền Admin"}
    onSaveUserAccess={saveAccountAccess}
    onDeleteUser={(userId) => mutate(() => deleteAccount(userId), "Đã xóa tài khoản.")}
    onRejectUser={(userId) => void mutate(() => updateAccount(userId, { status: "inactive", permissionGroupIds: [] }), "Đã từ chối tài khoản.")}
    onNavigateToCreateRole={() => onNavigateToPage("new-role")}
    onViewRoleDetail={onNavigateToEditRole}
  />;

  if (page === "edit-role") {
    const role = roles.find((item) => item.id === editingRoleId);
    if (!role) return <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-6 text-lg"><p>Không tìm thấy nhóm quyền.</p><button type="button" onClick={() => onNavigateToPage("roles")} className="mt-4 min-h-12 rounded-xl bg-emerald-700 px-5 font-semibold text-white">Quay lại danh sách</button></div>;
    return <PermissionGroupForm
      key={role.id} initialRole={role} permissions={permissions} modules={modules} saving={saving}
      onCancel={() => onNavigateToPage("roles")}
      onSave={async (data) => {
        const saved = await mutate(() => updatePermissionGroup(role.id, { name: data.name, description: data.description, color: data.color, icon: data.icon, actions: data.permissionIds as PermissionAction[] }), "Đã cập nhật nhóm quyền.");
        if (saved) onNavigateToPage("roles");
        return saved;
      }}
    />;
  }

  return <SystemSettingsView
    key={`${activeTab}-${page}`}
    roles={roles} permissions={permissions} modules={modules} users={users} saving={saving}
    initialActiveSubTab={activeTab === "permissions" ? page === "roles" ? "manage_roles" : page === "new-role" ? "create_role" : "dashboard" : "dashboard"}
    onCreateRole={(role) => mutate(() => createPermissionGroup({ name: role.name, description: role.description, color: role.color, icon: role.icon, actions: role.permissionIds as PermissionAction[] }), "Đã tạo nhóm quyền.")}
    onDeleteRole={(roleId) => mutate(() => deletePermissionGroup(roleId), "Đã xóa nhóm quyền.")}
    onSetRoleStatus={(roleId, status) => mutate(() => updatePermissionGroup(roleId, { status }), status === "active" ? "Đã kích hoạt nhóm quyền." : "Đã vô hiệu hóa nhóm quyền.")}
    onNavigateToRoles={() => onNavigateToPage("roles")}
    onNavigateToCreateRole={() => onNavigateToPage("new-role")}
  />;
}
