import type { User } from './types';

const USERS_STORAGE_KEY = 'asia_fnb_access_control_users_v1';

export function getStoredAccessUsers(fallback: User[]): User[] {
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!stored) return fallback;
    const users = JSON.parse(stored);
    return Array.isArray(users) ? (users as User[]) : fallback;
  } catch (error) {
    console.error('Không thể đọc danh sách tài khoản đã lưu', error);
    return fallback;
  }
}

export function saveStoredAccessUsers(users: User[]): void {
  try {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Không thể lưu danh sách tài khoản', error);
  }
}
