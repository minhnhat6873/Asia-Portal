"use client";

import { useState } from "react";
import { UserManagementView } from "./components/UserManagementView";
import { SystemSettingsView } from "./components/SystemSettingsView";
import {
  INITIAL_LOGS,
  INITIAL_ROLES,
  INITIAL_USERS,
} from "./data/initialData";
import { ACCESS_MODULES, ACCESS_PERMISSIONS } from "./permissionCatalog";
import { AuditLog, Role, User } from "./types";
import type { TrashItem } from "@/app/(page)/admin/Dashboard/types";

type AccessControlTab = "permissions" | "system-settings";

interface AccessControlTabsProps {
  activeTab: AccessControlTab;
  onNavigate: (tab: AccessControlTab) => void;
  trashItems: TrashItem[];
  onAddTrashItem: (item: Omit<TrashItem, "id" | "deletedAt">) => void;
  onRemoveTrashItem: (trashId: string) => void;
  onRestoreExternalTrashItem: (item: TrashItem) => void;
}

export function AccessControlTabs({ activeTab, onNavigate, trashItems, onAddTrashItem, onRemoveTrashItem, onRestoreExternalTrashItem }: AccessControlTabsProps) {
  const [users, setUsers] = useState<User[]>(() =>
    INITIAL_USERS.map((user) => ({ ...user, roleId: "role_admin", branch: "ASIA F&B" }))
  );
  const [roles, setRoles] = useState<Role[]>(() =>
    INITIAL_ROLES
      .filter((role) => role.id === "role_admin")
      .map((role) => ({ ...role, permissionIds: ACCESS_PERMISSIONS.map((permission) => permission.id) }))
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    INITIAL_LOGS.filter(
      (log) =>
        !["Quản lý Chi nhánh", "Thu ngân", "Bếp trưởng", "Nhân viên Phục vụ"].some(
          (name) => log.detail.includes(name) || log.target.includes(name)
        )
    )
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<"dashboard" | "manage_roles" | "create_role" | "audit_logs">("dashboard");

  const addLog = (action: string, detail: string, target: string, type: AuditLog["type"]) => {
    setAuditLogs((logs) => [
      {
        id: `log_${Date.now()}`,
        action,
        detail,
        actor: "Quản trị viên",
        target,
        timestamp: new Date().toLocaleString("vi-VN"),
        type,
      },
      ...logs,
    ]);
  };

  if (activeTab === "permissions") {
    // Duyệt tài khoản chờ duyệt (từ thẻ "Tài khoản chưa duyệt")
    return (
      <UserManagementView
        users={users}
        roles={roles}
        permissions={ACCESS_PERMISSIONS}
        modules={ACCESS_MODULES}
        onUpdateUserRole={(userId, roleId) => {
          setUsers((items) => items.map((user) => user.id === userId ? { ...user, roleId } : user));
          addLog("Phân quyền người dùng", "Đã cập nhật nhóm quyền cho người dùng.", userId, "user_assign");
        }}
        onToggleUserStatus={(userId) => setUsers((items) => items.map((user) => user.id === userId ? { ...user, status: user.status === "active" ? "suspended" : "active" } : user))}
        onApproveUser={(userId, roleId) => {
          setUsers((items) =>
            items.map((user) =>
              user.id === userId
                ? { ...user, status: "active" as const, roleId: roleId ?? user.roleId }
                : user
            )
          );
          const approvedUser = users.find((user) => user.id === userId);
          if (approvedUser) {
            addLog(
              "Duyệt tài khoản",
              roleId
                ? `Đã duyệt và gán nhóm quyền cho ${approvedUser.name}.`
                : `Đã duyệt tài khoản ${approvedUser.name}.`,
              approvedUser.name,
              "user_update"
            );
          }
        }}
        onRejectUser={(userId) => {
          const rejectedUser = users.find((user) => user.id === userId);
          setUsers((items) => items.map((user) => user.id === userId ? { ...user, status: "rejected" } : user));
          if (rejectedUser) addLog("Từ chối tài khoản", `Đã từ chối tài khoản ${rejectedUser.name}.`, rejectedUser.name, "user_update");
        }}
        onDeleteUser={(userId) => {
          const deletedUser = users.find((user) => user.id === userId);
          setUsers((items) => items.filter((user) => user.id !== userId));
          if (deletedUser) {
            onAddTrashItem({ entityType: "access_user", title: deletedUser.name, payload: deletedUser });
            addLog("Xóa tài khoản", `Đã chuyển tài khoản ${deletedUser.name} vào Thùng rác.`, deletedUser.name, "user_update");
          }
        }}
        onAddUser={(user) => {
          const newUser: User = { ...user, id: `usr_${Date.now()}`, lastActive: "Vừa tạo" };
          setUsers((items) => [newUser, ...items]);
          addLog("Thêm tài khoản", `Đã tạo tài khoản ${newUser.name}.`, newUser.name, "user_create");
        }}
        onNavigateToCreateRole={() => {
          setSettingsSubTab("create_role");
          onNavigate("system-settings");
        }}
        onViewRoleDetail={(roleId) => {
          setSelectedRoleId(roleId);
          setSettingsSubTab("manage_roles");
          onNavigate("system-settings");
        }}
      />
    );
  }

  // Chuyển tab (permissions = quản lý người dùng, system-settings = cài đặt hệ thống)
  return (
    <SystemSettingsView
      roles={roles}
      permissions={ACCESS_PERMISSIONS}
      modules={ACCESS_MODULES}
      users={users}
      auditLogs={auditLogs}
      initialActiveSubTab={settingsSubTab}
      selectedRoleIdToView={selectedRoleId}
      onCreateRole={(role) => {
        const newRole: Role = { ...role, id: `role_${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        setRoles((items) => [...items, newRole]);
        setSelectedRoleId(newRole.id);
        addLog("Tạo nhóm quyền", `Đã tạo nhóm quyền ${newRole.name}.`, newRole.name, "role_create");
      }}
      onUpdateRolePermissions={(roleId, permissionIds) => setRoles((items) => items.map((role) => role.id === roleId ? { ...role, permissionIds, updatedAt: new Date().toISOString() } : role))}
      onDeleteRole={(roleId) => {
        const deletedRole = roles.find((role) => role.id === roleId && !role.isSystemDefault);
        if (!deletedRole) return;
        setRoles((items) => items.filter((role) => role.id !== roleId));
        onAddTrashItem({ entityType: "role", title: deletedRole.name, payload: deletedRole });
        setSelectedRoleId(null);
        addLog("Xóa nhóm quyền", `Đã chuyển nhóm quyền ${deletedRole.name} vào Thùng rác.`, deletedRole.name, "role_delete");
      }}
      onAssignUsersToRole={(roleId, userIds) => setUsers((items) => items.map((user) => userIds.includes(user.id) ? { ...user, roleId } : user))}
      onNavigateToUserTab={() => onNavigate("permissions")}
      trashItems={trashItems}
      onRestoreTrashItem={(item) => {
        if (item.entityType === "role") {
          const role = item.payload as Role;
          setRoles((items) => items.some((entry) => entry.id === role.id) ? items : [...items, role]);
        } else if (item.entityType === "access_user") {
          const user = item.payload as User;
          setUsers((items) => items.some((entry) => entry.id === user.id) ? items : [user, ...items]);
        } else {
          onRestoreExternalTrashItem(item);
        }
        onRemoveTrashItem(item.id);
      }}
      onPermanentlyDeleteTrashItem={onRemoveTrashItem}
    />
  );
}
