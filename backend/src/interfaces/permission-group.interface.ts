export const PERMISSION_ACTIONS = [
  "dashboard:view",
  "meetings:view",
  "meetings:create",
  "meetings:update",
  "meetings:delete",
  "employees:view",
  "employees:view-birth-date",
  "employees:create",
  "employees:update",
  "employees:delete",
  "employees:trash",
  "media:view",
  "media:create",
  "media:update",
  "media:publish",
  "media:delete",
  "media:trash",
] as const;

export const PERMISSION_GROUP_STATUSES = ["active", "inactive"] as const;
export const PERMISSION_GROUP_COLORS = ["emerald", "blue", "purple", "orange", "rose", "pink", "slate"] as const;
export const PERMISSION_GROUP_ICONS = ["shield", "users", "calendar", "image", "files", "briefcase", "settings", "cloud", "crown", "user"] as const;
export type PermissionGroupColor = (typeof PERMISSION_GROUP_COLORS)[number];
export type PermissionGroupIcon = (typeof PERMISSION_GROUP_ICONS)[number];

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export function filterPermissionActions(actions: readonly string[]): PermissionAction[] {
  return [...new Set(actions)].filter((action): action is PermissionAction => PERMISSION_ACTIONS.includes(action as PermissionAction));
}
export type PermissionGroupStatus = (typeof PERMISSION_GROUP_STATUSES)[number];

export interface PermissionGroup {
  name: string;
  description?: string;
  color?: PermissionGroupColor;
  icon?: PermissionGroupIcon;
  actions: PermissionAction[];
  status: PermissionGroupStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePermissionGroupInput {
  name: string;
  description?: string;
  color?: PermissionGroupColor;
  icon?: PermissionGroupIcon;
  actions: PermissionAction[];
}

export interface UpdatePermissionGroupInput {
  name?: string;
  description?: string;
  color?: PermissionGroupColor;
  icon?: PermissionGroupIcon;
  actions?: PermissionAction[];
  status?: PermissionGroupStatus;
}

export interface PermissionGroupResponse {
  id: string;
  name: string;
  description: string;
  color: PermissionGroupColor;
  icon: PermissionGroupIcon;
  actions: PermissionAction[];
  status: PermissionGroupStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
