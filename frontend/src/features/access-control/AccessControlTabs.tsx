"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserManagementView } from "./components/UserManagementView";
import { SystemSettingsView } from "./components/SystemSettingsView";
import { ACCESS_MODULES, ACCESS_PERMISSIONS } from "./permissionCatalog";
import type { AuditLog, Role, User } from "./types";
import type { TrashItem } from "@/features/admin/dashboard/types";
import {
  createAccount,
  createPermissionGroup,
  getAccounts,
  getPermissionGroups,
  updateAccount,
  updatePermissionGroup,
  type ApiAccount,
  type ApiPermissionGroup,
  type PermissionAction,
} from "@/services/access-control.service";

type AccessControlTab = "permissions" | "system-settings";
export type AccessControlPage = "accounts" | "roles" | "new-role" | "trash";

interface AccessControlTabsProps {
  page: AccessControlPage;
  onNavigateToPage: (page: AccessControlPage) => void;
  activeTab: AccessControlTab;
  onNavigate: (tab: AccessControlTab) => void;
  trashItems: TrashItem[];
  onAddTrashItem: (item: Omit<TrashItem, "id" | "deletedAt">) => void;
  onRemoveTrashItem: (trashId: string) => void;
  onRestoreExternalTrashItem: (item: TrashItem) => void | Promise<void>;
}

function toRole(group: ApiPermissionGroup): Role {
  return {
    id: group.id,
    name: group.name,
    code: group.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "GROUP",
    description: `${group.actions.length} quyền đang áp dụng từ backend`,
    color: "emerald",
    permissionIds: group.actions,
    createdAt: group.createdAt ?? "",
    updatedAt: group.updatedAt ?? "",
  };
}

function toUser(account: ApiAccount): User {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone ?? "",
    roleId: account.role === "admin" ? "" : account.permissionGroupIds[0] ?? "",
    branch: "ASIA F&B",
    department: account.role === "admin" ? "Quản trị hệ thống" : "",
    status: account.status === "inactive" ? "suspended" : account.status,
    lastActive: account.updatedAt ? new Date(account.updatedAt).toLocaleString("vi-VN") : "",
  };
}

export function AccessControlTabs({ activeTab, onNavigate, page, onNavigateToPage, trashItems, onRemoveTrashItem, onRestoreExternalTrashItem }: AccessControlTabsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<"dashboard" | "manage_roles" | "create_role" | "audit_logs">("dashboard");
  const [auditLogs] = useState<AuditLog[]>([]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accounts, groups] = await Promise.all([getAccounts(), getPermissionGroups()]);
      setUsers(accounts.map(toUser));
      setRoles(groups.filter((group) => group.status === "active").map(toRole));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải dữ liệu phân quyền.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const saveAccountAccess = async (userId: string, access: { roleId: string; status: "active" | "suspended" }) => {
    try {
      await updateAccount(userId, {
        status: access.status === "suspended" ? "inactive" : "active",
        permissionGroupIds: access.roleId ? [access.roleId] : [],
      });
      await reload();
      toast.success("Đã cập nhật trạng thái và nhóm quyền.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật tài khoản.");
    }
  };

  const routedSubTab = page === "roles" ? "manage_roles" : page === "new-role" ? "create_role" : page === "trash" ? "audit_logs" : "dashboard";
  const initialActiveSubTab = activeTab === "permissions" ? routedSubTab : settingsSubTab;

  if (isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải dữ liệu phân quyền...</div>;

  if (activeTab === "permissions" && page === "accounts") {
    return <UserManagementView
      users={users}
      roles={roles.filter((role) => !role.isSystemDefault)}
      permissions={ACCESS_PERMISSIONS}
      modules={ACCESS_MODULES}
      onSaveUserAccess={saveAccountAccess}
      onApproveUser={(userId, roleId) => void saveAccountAccess(userId, { roleId: roleId ?? "", status: "active" })}
      onRejectUser={(userId) => void saveAccountAccess(userId, { roleId: "", status: "suspended" })}
      onDeleteUser={(userId) => void saveAccountAccess(userId, { roleId: "", status: "suspended" })}
      onAddUser={(user) => void (async () => {
        try {
          if (!user.password) {
            toast.error("Vui lòng nhập mật khẩu ban đầu.");
            return;
          }
          await createAccount({ name: user.name, email: user.email, password: user.password, role: "manager", permissionGroupIds: user.roleId ? [user.roleId] : [] });
          await reload();
          toast.success("Đã tạo tài khoản.");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể tạo tài khoản."); }
      })()}
      onNavigateToCreateRole={() => onNavigateToPage("new-role")}
      onViewRoleDetail={(roleId) => { setSelectedRoleId(roleId); onNavigateToPage("roles"); }}
    />;
  }

  return <SystemSettingsView
    roles={roles}
    permissions={ACCESS_PERMISSIONS}
    key={`${activeTab}-${page}`}
    modules={ACCESS_MODULES}
    users={users}
    auditLogs={auditLogs}
    initialActiveSubTab={initialActiveSubTab}
    selectedRoleIdToView={selectedRoleId}
    onCreateRole={(role) => void (async () => {
      try { await createPermissionGroup({ name: role.name, actions: role.permissionIds as PermissionAction[] }); await reload(); toast.success("Đã tạo nhóm quyền."); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Không thể tạo nhóm quyền."); }
    })()}
    onUpdateRolePermissions={(roleId, permissionIds) => void (async () => {
      try { await updatePermissionGroup(roleId, { actions: permissionIds as PermissionAction[] }); await reload(); toast.success("Đã lưu nhóm quyền."); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Không thể lưu nhóm quyền."); }
    })()}
    onDeleteRole={(roleId) => void (async () => {
      try { await updatePermissionGroup(roleId, { status: "inactive" }); await reload(); toast.success("Đã ngừng áp dụng nhóm quyền."); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Không thể cập nhật nhóm quyền."); }
    })()}
    onAssignUsersToRole={(roleId, userIds) => void Promise.all(userIds.map((userId) => updateAccount(userId, { permissionGroupIds: [roleId] }))).then(reload).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Không thể gán nhóm quyền."))}
    onNavigateToUserTab={() => activeTab === "permissions" ? onNavigateToPage("accounts") : onNavigate("permissions")}
    onNavigateToRoles={() => activeTab === "permissions" ? onNavigateToPage("roles") : setSettingsSubTab("manage_roles")}
    trashItems={trashItems}
    onRestoreTrashItem={async (item) => { await onRestoreExternalTrashItem(item); onRemoveTrashItem(item.id); }}
    onPermanentlyDeleteTrashItem={onRemoveTrashItem}
  />;
}
