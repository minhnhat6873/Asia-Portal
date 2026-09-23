export const PERMISSION_ACTIONS = [
  "dashboard:view",
  "employees:view",
  "employees:create",
  "employees:update",
  "employees:deactivate",
] as const;

export const PERMISSION_GROUP_STATUSES = ["active", "inactive"] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionGroupStatus = (typeof PERMISSION_GROUP_STATUSES)[number];

export interface PermissionGroup {
  name: string;
  actions: PermissionAction[];
  status: PermissionGroupStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePermissionGroupInput {
  name: string;
  actions: PermissionAction[];
}

export interface UpdatePermissionGroupInput {
  name?: string;
  actions?: PermissionAction[];
  status?: PermissionGroupStatus;
}

export interface PermissionGroupResponse {
  id: string;
  name: string;
  actions: PermissionAction[];
  status: PermissionGroupStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
