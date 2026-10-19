import type { GroupColor, GroupIcon } from './permission-group-appearance';

export type RiskLevel = 'low' | 'medium' | 'high';

export type SystemModuleId = 'employees' | 'media' | 'meetings' | 'dashboard';

export interface SystemPermission {
  id: string;
  code: string;
  name: string;
  description: string;
  module: SystemModuleId;
  riskLevel: RiskLevel;
}

export interface ModuleCategory {
  id: SystemModuleId;
  name: string;
  code: string;
  description: string;
  iconName: string;
}

export interface Role {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  code: string;
  description: string;
  color: GroupColor;
  icon: GroupIcon;
  permissionIds: string[];
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleIds: string[];
  accountRole: 'admin' | 'manager' | 'user';
  status: 'active' | 'suspended' | 'pending' | 'rejected';
  avatar?: string;
  createdAt?: string;
  /** Only present while creating an account; never persisted in frontend state. */
  password?: string;
}

export type NewUserInput = Pick<User, 'name' | 'email' | 'phone' | 'roleIds'> & {accountRole: 'admin' | 'manager'; password: string; confirmPassword: string};
