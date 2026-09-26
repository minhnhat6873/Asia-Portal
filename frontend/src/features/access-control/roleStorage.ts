import type { Role } from './types';

const ROLES_STORAGE_KEY = 'asia_fnb_access_control_roles_v1';

export function getStoredRoles(fallback: Role[]): Role[] {
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = window.localStorage.getItem(ROLES_STORAGE_KEY);
    if (!stored) return fallback;
    const roles = JSON.parse(stored);
    return Array.isArray(roles) ? (roles as Role[]) : fallback;
  } catch (error) {
    console.error('Không thể đọc danh sách nhóm quyền đã lưu', error);
    return fallback;
  }
}

export function saveStoredRoles(roles: Role[]): void {
  try {
    window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  } catch (error) {
    console.error('Không thể lưu danh sách nhóm quyền', error);
  }
}
