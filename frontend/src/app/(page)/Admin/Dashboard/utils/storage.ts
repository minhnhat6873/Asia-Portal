import { Employee, MediaPost, TrashItem, UserAccount } from '../types';
import { INITIAL_EMPLOYEES, INITIAL_MEDIA_POSTS, INITIAL_USERS } from '../data/initialData';
import { notifyPortalContentChanged } from '@/lib/portalContent';

const EMPLOYEES_STORAGE_KEY = 'asia_fnb_employees_v2';
const MEDIA_STORAGE_KEY = 'asia_fnb_media_v2';
const USERS_STORAGE_KEY = 'asia_fnb_users_v2';
const CURRENT_USER_KEY = 'asia_fnb_current_user_v2';
const TRASH_STORAGE_KEY = 'asia_fnb_trash_v1';

export function getStoredTrashItems(): TrashItem[] {
  try {
    const item = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!item) return [];
    const parsed = JSON.parse(item) as TrashItem[];
    const seen = new Set<string>();
    const seenEntities = new Set<string>();
    let changed = false;
    const normalized = parsed.filter((trashItem) => {
      const payloadId =
        trashItem.payload && typeof trashItem.payload === 'object' && 'id' in trashItem.payload
          ? String((trashItem.payload as { id: unknown }).id)
          : trashItem.id;
      const entityKey = `${trashItem.entityType}:${payloadId}`;
      if (seen.has(trashItem.id) || seenEntities.has(entityKey)) {
        changed = true;
        return false;
      }
      seen.add(trashItem.id);
      seenEntities.add(entityKey);
      return true;
    });
    if (changed) localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.error('Error reading trash from localStorage', error);
    return [];
  }
}

export function saveStoredTrashItems(items: TrashItem[]): void {
  try {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(items));
    notifyPortalContentChanged();
  } catch (error) {
    console.error('Error saving trash to localStorage', error);
  }
}

export function getStoredEmployees(): Employee[] {
  try {
    const item = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Error reading employees from localStorage', error);
    return INITIAL_EMPLOYEES;
  }
}

export function saveStoredEmployees(employees: Employee[]): void {
  try {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
    // Let the public portal pages re-read immediately (same tab and other tabs).
    notifyPortalContentChanged();
  } catch (error) {
    console.error('Error saving employees to localStorage', error);
  }
}

export function getStoredMediaPosts(): MediaPost[] {
  try {
    const item = localStorage.getItem(MEDIA_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(INITIAL_MEDIA_POSTS));
      return INITIAL_MEDIA_POSTS;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Error reading media posts from localStorage', error);
    return INITIAL_MEDIA_POSTS;
  }
}

export function saveStoredMediaPosts(posts: MediaPost[]): void {
  try {
    localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(posts));
    // Let the public portal pages re-read immediately (same tab and other tabs).
    notifyPortalContentChanged();
  } catch (error) {
    console.error('Error saving media posts to localStorage', error);
  }
}

export function resetToDefaults(): { employees: Employee[]; mediaPosts: MediaPost[] } {
  localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
  localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(INITIAL_MEDIA_POSTS));
  notifyPortalContentChanged();
  return {
    employees: INITIAL_EMPLOYEES,
    mediaPosts: INITIAL_MEDIA_POSTS
  };
}

/* -------------------------------------------------------------------------- *
 * Accounts & permissions — the "Phân quyền quản lý" tab
 * -------------------------------------------------------------------------- */

export function getStoredUsers(): UserAccount[] {
  try {
    const item = localStorage.getItem(USERS_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const users = JSON.parse(item) as UserAccount[];
    let changed = false;
    const next = users.map((user) => {
      if (
        user.username === "admin" &&
        (user.fullName === "Quản Trị Viên Hệ Thống" || user.fullName === "Ban Quản Trị Hệ Thống")
      ) {
        changed = true;
        return { ...user, fullName: "admin" };
      }
      return user;
    });
    if (changed) localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error('Error reading users from localStorage', error);
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    notifyPortalContentChanged();
  } catch (error) {
    console.error('Error saving users to localStorage', error);
  }
}

/** Creates or refreshes a registration request for approval in the admin panel. */
export function registerPendingUser(account: {
  fullName: string;
  email: string;
  phone: string;
}): void {
  const email = account.email.trim().toLowerCase();
  if (!email || !account.fullName.trim()) return;

  const users = getStoredUsers();
  const username = email.split('@')[0].replace(/[^a-z0-9._-]/gi, '') || `user${Date.now()}`;
  const existingIndex = users.findIndex((user) => user.email.toLowerCase() === email);
  // Existing approved, rejected, or protected accounts must never be replaced by a new request.
  if (existingIndex >= 0 && users[existingIndex].status !== 'pending') return;
  const pendingUser: UserAccount = {
    id: existingIndex >= 0 ? users[existingIndex].id : `user-${Date.now()}`,
    username,
    fullName: account.fullName.trim(),
    email,
    phone: account.phone.trim(),
    department: 'Chờ phân công',
    status: 'pending',
    role: 'hr_manager',
    permissions: {
      canViewDashboard: false,
      canManageEmployees: false,
      canManageMedia: false,
      canManagePermissions: false,
      canExportData: false,
    },
    createdAt: new Date().toLocaleDateString('vi-VN'),
  };

  const nextUsers =
    existingIndex >= 0
      ? users.map((user, index) => (index === existingIndex ? { ...user, ...pendingUser } : user))
      : [...users, pendingUser];
  saveStoredUsers(nextUsers);
}

/** The signed-in dashboard account; falls back to the seeded admin. */
export function getCurrentUser(): UserAccount | null {
  try {
    const item = localStorage.getItem(CURRENT_USER_KEY);
    if (!item) return INITIAL_USERS[0];
    return JSON.parse(item);
  } catch (error) {
    console.error('Error reading current user from localStorage', error);
    return INITIAL_USERS[0];
  }
}

export function setCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (error) {
    console.error('Error setting current user to localStorage', error);
  }
}

export function exportEmployeesToCSV(employees: Employee[]): void {
  const headers = ['Mã nhân viên', 'Họ và tên', 'Chức vụ', 'Phòng ban', 'Trạng thái', 'Ngày gia nhập', 'Ngày sinh', 'Văn phòng', 'Email', 'Số điện thoại'];
  const rows = employees.map(emp => [
    emp.code,
    `"${emp.fullName}"`,
    `"${emp.position}"`,
    `"${emp.department}"`,
    emp.status === 'active' ? 'Đang làm việc' : emp.status === 'probation' ? 'Thử việc' : 'Đã nghỉ',
    emp.joinDate,
    emp.birthDate,
    `"${emp.location}"`,
    emp.email,
    emp.phone
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `asia_fnb_nhan_su_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
