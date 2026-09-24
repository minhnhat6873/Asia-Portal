export type RiskLevel = 'low' | 'medium' | 'high';

export type SystemModuleId = 'pos' | 'menu' | 'inventory' | 'finance' | 'hr' | 'system';

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
  code: string;
  description: string;
  color: string;
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
  roleId: string;
  branch: string;
  department: string;
  status: 'active' | 'suspended' | 'pending' | 'rejected';
  avatar?: string;
  lastActive: string;
}

export interface AuditLog {
  id: string;
  action: string;
  detail: string;
  actor: string;
  target: string;
  timestamp: string;
  type: 'role_create' | 'role_update' | 'role_delete' | 'user_assign' | 'user_create' | 'user_update';
}
