"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Employee,
  MediaPost,
  ActiveTab,
  UserAccount,
  UserRole,
  UserPermissions,
  UserStatus,
  TrashItem
} from './types';
import {
  getStoredMediaPosts,
  saveStoredMediaPosts,
  getStoredUsers,
  saveStoredUsers,
  getStoredTrashItems,
  saveStoredTrashItems,
  getCurrentUser,
  setCurrentUser as persistCurrentUser
} from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { EmployeeManagement } from './components/EmployeeManagement';
import { EmployeeTrashPage } from './components/EmployeeTrashPage';
import { MediaManagement } from './components/MediaManagement';
import { AddEmployeePage } from './components/AddEmployeePage';
import { AddMediaPage } from './components/AddMediaPage';
import { DEFAULT_ROLE_PERMISSIONS, PermissionsManagement } from './components/PermissionsManagement';
import { AccessControlTabs, type AccessControlPage } from '@/features/access-control/AccessControlTabs';
import AccountPage from '@/features/admin/account/AccountPage';
import Image from 'next/image';
import Link from 'next/link';
import { clearAdminSession, getAdminSession, type AdminUser } from '@/lib/adminSession';
import { logoutAdmin } from '@/features/admin/login/auth.service';
import { subscribePortalContent } from '@/lib/portalContent';
import { ChevronDown, KeyRound, LogOut, Menu, ShieldCheck, UserRound } from 'lucide-react';
import { getDashboardSummary, type DashboardSummary } from './dashboard.service';
import { getAdminEmployee, getAdminEmployees, softDeleteAdminEmployee, type AdminEmployeeListParams, type AdminEmployeeResult } from '@/services/admin-employee.service';
import { toast } from 'sonner';

export const ADMIN_TAB_ROUTES: Record<ActiveTab, string> = {
  overview: '/admin/dashboard',
  employees: '/admin/employees',
  'add-employee': '/admin/employees/new',
  'edit-employee': '/admin/employees',
  media: '/admin/media',
  'add-media': '/admin/media/new',
  permissions: '/admin/access-control',
  'system-settings': '/admin/settings',
  account: '/admin/account',
};
const ACCESS_CONTROL_PAGE_ROUTES: Record<AccessControlPage, string> = {
  accounts: '/admin/access-control',
  roles: '/admin/access-control/roles',
  'new-role': '/admin/access-control/roles/new',
  trash: '/admin/access-control/trash',
};


interface AdminDashboardProps {
  initialTab?: ActiveTab;
}

function getTabFromPath(pathname: string): ActiveTab {
  if (pathname === "/admin/employees/new") return "add-employee";
  if (/^\/admin\/employees\/[^/]+\/edit$/.test(pathname)) return "edit-employee";
  if (pathname.startsWith("/admin/employees")) return "employees";
  if (pathname === "/admin/media/new") return "add-media";
  if (pathname.startsWith("/admin/media")) return "media";
  if (pathname.startsWith("/admin/access-control")) return "permissions";
  if (pathname.startsWith("/admin/settings")) return "system-settings";
  if (pathname.startsWith("/admin/account")) return "account";
  return "overview";
}

function formatEmployeeDate(value?: string): string {
  if (!value) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCFullYear()),
  ].join("/");
}

function mapApiEmployeeToDashboardEmployee(employee: AdminEmployeeResult): Employee {
  return {
    id: employee._id,
    code: employee.employeeCode,
    fullName: employee.name,
    position: employee.position,
    department: employee.department,
    rank: employee.rank ?? "",
    email: employee.email,
    phone: employee.phone,
    location: employee.location,
    avatar: employee.avatar ?? "",
    joinDate: formatEmployeeDate(employee.joinDate),
    birthDate: formatEmployeeDate(employee.birthDate),
    status: employee.status,
    bio: employee.description ?? "",
    createdBy: employee.createdBy,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

function getAccessControlPage(pathname: string): AccessControlPage {
  if (pathname === '/admin/access-control/roles/new') return 'new-role';
  if (pathname === '/admin/access-control/roles') return 'roles';
  if (pathname === '/admin/access-control/trash') return 'trash';
  return 'accounts';
}


export default function AdminDashboard({ initialTab }: AdminDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => initialTab ?? getTabFromPath(pathname));
  const accessControlPage = getAccessControlPage(pathname);
  const isEmployeeTrashPage = pathname === '/admin/employees/trash';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [employeeListParams, setEmployeeListParams] = useState<AdminEmployeeListParams>({ page: 1, limit: 12 });
  const [employeesLoadError, setEmployeesLoadError] = useState<string | null>(null);
  const [areEmployeesLoading, setAreEmployeesLoading] = useState(true);
  const editingEmployeeId = pathname.match(/^\/admin\/employees\/([^/]+)\/edit$/)?.[1];
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEditingEmployeeLoading, setIsEditingEmployeeLoading] = useState(false);
  const [editingEmployeeError, setEditingEmployeeError] = useState<string | null>(null);
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(null);
  const [sessionAccount, setSessionAccount] = useState<AdminUser | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  useEffect(() => {
    setActiveTab(getTabFromPath(pathname));
  }, [pathname]);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingEmployeeId) {
      setEditingEmployee(null);
      setEditingEmployeeError(null);
      setIsEditingEmployeeLoading(false);
      return;
    }

    const employeeId = decodeURIComponent(editingEmployeeId);
    if (!/^[a-f\d]{24}$/i.test(employeeId)) {
      setEditingEmployee(null);
      setEditingEmployeeError("Không tìm thấy hồ sơ nhân viên trên hệ thống.");
      setIsEditingEmployeeLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsEditingEmployeeLoading(true);
    setEditingEmployeeError(null);

    void getAdminEmployee(employeeId, controller.signal)
      .then((employee) => setEditingEmployee(mapApiEmployeeToDashboardEmployee(employee)))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setEditingEmployee(null);
          setEditingEmployeeError(error instanceof Error ? error.message : "Không thể tải hồ sơ nhân viên.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsEditingEmployeeLoading(false);
      });

    return () => controller.abort();
  }, [editingEmployeeId]);

  useEffect(() => {
    const syncSession = () => setSessionAccount(getAdminSession());
    syncSession();
    window.addEventListener("asia-admin-session", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("asia-admin-session", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const loadEmployees = useCallback(async (signal?: AbortSignal) => {
    setAreEmployeesLoading(true);
    try {
      const result = await getAdminEmployees(employeeListParams, signal);
      setEmployees(result.items.map(mapApiEmployeeToDashboardEmployee));
      setEmployeeTotal(result.pagination.total);
      setEmployeesLoadError(null);
    } catch (error) {
      if (!signal?.aborted) {
        setEmployees([]);
        setEmployeeTotal(0);
        setEmployeesLoadError(error instanceof Error ? error.message : "Không thể tải danh sách nhân viên.");
      }
    } finally {
      if (!signal?.aborted) setAreEmployeesLoading(false);
    }
  }, [employeeListParams]);

  const refreshDashboardSummary = useCallback(async (signal?: AbortSignal) => {
    try {
      const summary = await getDashboardSummary(signal);
      setDashboardSummary(summary);
    } catch {
      if (!signal?.aborted) setDashboardSummary(null);
    }
  }, []);

  const handleEmployeeFiltersChange = useCallback((filters: AdminEmployeeListParams) => {
    setEmployeeListParams({ ...filters, page: 1, limit: 12 });
  }, []);

  const handleEmployeePageChange = useCallback((page: number) => {
    setEmployeeListParams((current) => ({ ...current, page }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadEmployees(controller.signal);
    return () => controller.abort();
  }, [loadEmployees]);
  useEffect(() => {
    const controller = new AbortController();
    void refreshDashboardSummary(controller.signal);

    return () => controller.abort();
  }, [refreshDashboardSummary]);
  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const closeMenu = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setIsAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isAccountMenuOpen]);
  // Modal & Navigation triggers
  const [selectedDossierEmployee, setSelectedDossierEmployee] = useState<Employee | null>(null);
  const [previewMediaPost, setPreviewMediaPost] = useState<MediaPost | null>(null);

  // Initialize data from localStorage, then stay in step with any other tab
  // that edits the same store (e.g. a second admin dashboard window).
  useEffect(() => {
    const load = () => {
      setMediaPosts(getStoredMediaPosts());
      const storedUsers = getStoredUsers();
      const normalizedUsers = storedUsers.map((user) =>
        user.role === 'admin'
          ? {
              ...user,
              status: 'approved' as const,
              permissions: {
                canViewDashboard: true,
                canManageEmployees: true,
                canManageMedia: true,
                canManagePermissions: true,
                canExportData: true,
              },
            }
          : user
      );
      const needsAdminNormalization = normalizedUsers.some(
        (user, index) => JSON.stringify(user) !== JSON.stringify(storedUsers[index])
      );
      if (needsAdminNormalization) saveStoredUsers(normalizedUsers);
      setUsers(normalizedUsers);
      const storedTrashItems = getStoredTrashItems();
      const realTrashItems = storedTrashItems.filter((item) => item.entityType !== 'employee');
      if (realTrashItems.length !== storedTrashItems.length) saveStoredTrashItems(realTrashItems);
      setTrashItems(realTrashItems);
      setCurrentUserState(getCurrentUser());
    };

    load();
    return subscribePortalContent(load);
  }, []);

  // On phones, start with the content visible and open navigation as an overlay.
  useEffect(() => {
    const closeOnMobile = window.setTimeout(() => {
      if (window.matchMedia('(max-width: 767px)').matches) setIsSidebarOpen(false);
    }, 0);
    return () => window.clearTimeout(closeOnMobile);
  }, []);

  const navigateToTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    router.push(ADMIN_TAB_ROUTES[tab]);
    if (window.matchMedia('(max-width: 767px)').matches) setIsSidebarOpen(false);
  };
  // Helper toast notifier
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const notify = type === 'success' ? toast.success : type === 'error' ? toast.error : toast.info;
    notify(message);
  };

  const addTrashItem = (item: Omit<TrashItem, 'id' | 'deletedAt'>) => {
    const nextItem: TrashItem = {
      ...item,
      id: `trash-${crypto.randomUUID()}`,
      deletedAt: new Date().toLocaleString('vi-VN'),
      deletedBy: currentUser?.fullName,
    };
    setTrashItems((items) => {
      const payloadId =
        item.payload && typeof item.payload === 'object' && 'id' in item.payload
          ? String((item.payload as { id: unknown }).id)
          : item.title;
      if (items.some((existing) => {
        const existingPayloadId =
          existing.payload && typeof existing.payload === 'object' && 'id' in existing.payload
            ? String((existing.payload as { id: unknown }).id)
            : existing.title;
        return existing.entityType === item.entityType && existingPayloadId === payloadId;
      })) return items;
      const next = [nextItem, ...items];
      saveStoredTrashItems(next);
      return next;
    });
  };

  const removeTrashItem = (trashId: string) => {
    setTrashItems((items) => {
      const next = items.filter((item) => item.id !== trashId);
      saveStoredTrashItems(next);
      return next;
    });
  };

  // --- EMPLOYEE CRUD ---
  const handleAddEmployee = (newEmpData: Employee) => {
    const newEmployee: Employee = newEmpData.id
      ? newEmpData
      : { ...newEmpData, id: `emp-${Date.now()}` };
    const updated = [newEmployee, ...employees];
    setEmployees(updated);
    void refreshDashboardSummary();
    addToast(`Đã thêm nhân viên ${newEmployee.fullName} (${newEmployee.code}) thành công!`);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const updated = employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e));
    setEmployees(updated);
    if (selectedDossierEmployee?.id === updatedEmp.id) {
      setSelectedDossierEmployee(updatedEmp);
    }
    void refreshDashboardSummary();
    addToast(`Đã cập nhật thông tin nhân viên ${updatedEmp.fullName}!`);
  };

  const handleDeleteEmployee = async (id: string): Promise<boolean> => {
    const empToDelete = employees.find((e) => e.id === id);
    if (!empToDelete) return false;

    const loadingToastId = toast.loading('Đang xóa nhân viên, vui lòng chờ trong giây lát...');

    if (/^[a-f\d]{24}$/i.test(id)) {
      try {
        await softDeleteAdminEmployee(id);
      } catch (error) {
        toast.dismiss(loadingToastId);
        toast.error(error instanceof Error ? error.message : 'Không thể xóa nhân viên. Vui lòng thử lại.');
        return false;
      }
    }

    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    if (selectedDossierEmployee?.id === id) {
      setSelectedDossierEmployee(null);
    }
    toast.dismiss(loadingToastId);
    toast.success('Đã xóa nhân viên thành công.');
    void refreshDashboardSummary();
    return true;
  };

  // --- MEDIA CRUD ---
  const handleAddMedia = (newPostData: Omit<MediaPost, 'id'>) => {
    const newPost: MediaPost = {
      ...newPostData,
      id: `media-${Date.now()}`,
    };
    const updated = [newPost, ...mediaPosts];
    setMediaPosts(updated);
    saveStoredMediaPosts(updated);
    addToast(`Đã lưu bài viết truyền thông "${newPost.title.slice(0, 32)}..." thành công!`);
  };

  const handleUpdateMedia = (updatedPost: MediaPost) => {
    const updated = mediaPosts.map((m) => (m.id === updatedPost.id ? updatedPost : m));
    setMediaPosts(updated);
    saveStoredMediaPosts(updated);
    if (previewMediaPost?.id === updatedPost.id) {
      setPreviewMediaPost(updatedPost);
    }
    addToast(`Đã cập nhật bài viết truyền thông!`);
  };

  const handleDeleteMedia = (id: string) => {
    const postToDelete = mediaPosts.find((m) => m.id === id);
    if (!postToDelete) return;
    const updated = mediaPosts.filter((m) => m.id !== id);
    setMediaPosts(updated);
    saveStoredMediaPosts(updated);
    if (previewMediaPost?.id === id) {
      setPreviewMediaPost(null);
    }
    addTrashItem({ entityType: 'media', title: postToDelete.title, payload: postToDelete });
    addToast(`Đã xóa bài viết "${postToDelete?.title.slice(0, 28) || ''}..."`, 'info');
  };

  // --- ACCOUNT APPROVAL & PERMISSIONS ---

  const handleSetCurrentUser = (user: UserAccount | null) => {
    setCurrentUserState(user);
    persistCurrentUser(user);
  };

  const handleApproveUser = (userId: string, role: UserRole, permissions: UserPermissions) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    const effectivePermissions: UserPermissions =
      role === 'admin' ? DEFAULT_ROLE_PERMISSIONS.admin : permissions;

    const updatedUsers = users.map((u) =>
      u.id === userId
        ? {
            ...u,
            status: 'approved' as const,
            role,
            permissions: effectivePermissions,
            approvedAt: new Date().toLocaleDateString('vi-VN'),
            approvedBy: currentUser?.fullName || 'Quản Trị Viên',
          }
        : u
    );

    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    addToast(
      `Đã phê duyệt và phân quyền cho ${targetUser.fullName} (@${targetUser.username})! Tài khoản này hiện đã có thể đăng nhập.`,
      'success'
    );
  };

  const handleRejectUser = (userId: string, reason: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    const updatedUsers = users.map((u) =>
      u.id === userId
        ? {
            ...u,
            status: 'rejected' as const,
            rejectReason: reason,
            rejectedAt: new Date().toLocaleDateString('vi-VN'),
            rejectedBy: currentUser?.fullName || 'Quản Trị Viên',
          }
        : u
    );

    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    addToast(`Đã từ chối duyệt tài khoản @${targetUser.username}.`, 'info');
  };

  const handleUpdatePermissions = (userId: string, role: UserRole, permissions: UserPermissions) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    if (targetUser.role === 'admin') {
      addToast('Tài khoản Admin được bảo vệ và không thể thay đổi phân quyền.', 'info');
      return;
    }

    const fixedPermissions = role === 'admin' ? DEFAULT_ROLE_PERMISSIONS.admin : permissions;
    const updatedUsers = users.map((u) => {
      if (u.id !== userId) return u;
      const updated = { ...u, role, permissions: fixedPermissions };
      // Keep the signed-in copy in step when an admin edits their own rights.
      if (currentUser?.id === userId) handleSetCurrentUser(updated);
      return updated;
    });

    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    addToast(`Đã cập nhật phân quyền cho tài khoản ${targetUser.fullName}!`, 'success');
  };

  const handleToggleLockUser = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    if (targetUser.role === 'admin') {
      addToast('Tài khoản Admin được bảo vệ và không thể khóa.', 'info');
      return;
    }

    const newStatus: UserStatus = targetUser.status === 'locked' ? 'approved' : 'locked';
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));

    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    addToast(
      newStatus === 'locked'
        ? `Đã tạm khóa tài khoản @${targetUser.username}.`
        : `Đã mở khóa tài khoản @${targetUser.username}!`,
      'info'
    );
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    addTrashItem({ entityType: 'account', title: targetUser.fullName, payload: targetUser });
    addToast(`Đã chuyển tài khoản ${targetUser.fullName} vào Thùng rác.`, 'info');
  };

  const restoreExternalTrashItem = async (item: TrashItem) => {
    if (item.entityType === 'media') {
      const post = item.payload as MediaPost;
      setMediaPosts((items) => {
        const next = items.some((entry) => entry.id === post.id) ? items : [post, ...items];
        saveStoredMediaPosts(next);
        return next;
      });
      addToast(`Đã khôi phục bài truyền thông “${post.title}”.`);
      return;
    }
    if (item.entityType === 'account') {
      const account = item.payload as UserAccount;
      setUsers((items) => {
        const next = items.some((entry) => entry.id === account.id) ? items : [account, ...items];
        saveStoredUsers(next);
        return next;
      });
      addToast(`Đã khôi phục tài khoản ${account.fullName}.`);
    }
  };

  const pendingUsersCount = users.filter((u) => u.status === 'pending').length;

  return (
    <div className={`relative flex h-screen flex-col overflow-hidden bg-[#f8fafc] font-sans text-slate-800`}>
      {/* Toast notifications */}
      <header className="flex h-[76px] shrink-0 items-center justify-between bg-white px-4 sm:px-6 lg:px-8">
          <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-emerald-500">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center">
            <Image src="/assets/images/asia-logo.png" alt="Asia Food & Beverage" width={48} height={48} className="h-12 w-12 object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-[18px] font-black leading-tight tracking-[-0.035em] text-[#082c5c]">Asia Food &amp; Beverage</span>
            <span className="mt-1 block whitespace-nowrap text-[14px] font-semibold leading-[1.3] tracking-[-0.015em] text-[#00865a]">Cổng quản trị nội bộ</span>
          </span>
        </Link>
        <div ref={accountMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
            className="group flex items-center gap-3 rounded-2xl px-2 py-1.5 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-[#0d5c0d] text-sm font-black text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-100">
              {sessionAccount?.initials ?? "AF"}
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-44 truncate text-[13px] font-medium text-slate-800">{sessionAccount?.fullName ?? "Chưa đăng nhập"}</span>
              <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-normal text-slate-600"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />{sessionAccount?.role ?? "Tài khoản nội bộ"}</span>
            </span>
            <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${isAccountMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {isAccountMenuOpen && (
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/15">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-[#0d5c0d] text-sm font-black text-white">
                  {sessionAccount?.initials ?? "AF"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{sessionAccount?.fullName ?? "Tài khoản nội bộ"}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />{sessionAccount?.role ?? ""}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{sessionAccount?.email ?? ""}</span>
                </span>
              </div>

              <div className="mt-2 space-y-1">
                <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); router.push("/admin/account"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800">
                  <UserRound className="h-4 w-4 text-slate-500" />Hồ sơ cá nhân
                </button>
                <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); router.push("/admin/account?tab=password"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800">
                  <KeyRound className="h-4 w-4 text-slate-500" />Đổi mật khẩu
                </button>
              </div>

              <div className="my-2 border-t border-slate-100" />
              <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); void logoutAdmin().finally(() => { clearAdminSession(); router.replace("/admin/login"); }); }} className="flex w-full items-center gap-3 rounded-xl bg-rose-50 px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100">
                <LogOut className="h-4 w-4" />Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>

      <div aria-hidden="true" className="h-px w-full shrink-0 bg-slate-200" />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">      {/* Persistent Sidebar (Stays on screen as requested) */}
      <div
        className={`h-full shrink-0 transition-[width] duration-300 ease-in-out ${
          isSidebarOpen ? 'overflow-visible' : 'overflow-hidden'
        } ${
          isSidebarOpen ? 'w-64 max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-2xl' : 'w-0'
        }`}
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            navigateToTab(tab);
            if (window.matchMedia('(max-width: 767px)').matches) setIsSidebarOpen(false);
          }}
          employeeCount={dashboardSummary?.totalEmployees ?? employeeTotal}
          mediaCount={mediaPosts.length}
          pendingUsersCount={pendingUsersCount}
        />
      </div>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Đóng thanh điều hướng"
          onClick={() => setIsSidebarOpen(false)}
          className="absolute inset-0 z-30 bg-slate-950/35 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar — back to the public portal + account dropdown */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 bg-transparent px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-label={isSidebarOpen ? 'Ẩn thanh điều hướng' : 'Mở thanh điều hướng'}
              aria-expanded={isSidebarOpen}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden ${
                isSidebarOpen
                  ? 'bg-transparent text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_0_12px_rgba(22,163,74,0.20)]'
                  : 'bg-transparent text-emerald-700 hover:bg-emerald-50 hover:shadow-[0_0_12px_rgba(22,163,74,0.24)]'
              }`}
            >
              <Menu className="h-[21px] w-[21px]" />
            </button>

            {/* Section title for the active tab */}
            <span className="hidden items-center gap-2 px-1 text-lg font-bold uppercase tracking-[0.04em] text-slate-800 lg:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.65)]" />
              {activeTab === 'overview' && 'Bảng Điều Khiển'}
              {activeTab === 'employees' && (isEmployeeTrashPage ? 'Thùng Rác Nhân Viên' : 'Quản Lý Nhân Sự')}
              {activeTab === 'add-employee' && 'Thêm Nhân Viên Mới'}
              {activeTab === 'media' && 'Quản Lý Truyền Thông'}
              {activeTab === 'add-media' && 'Đăng Tin Truyền Thông'}
              {activeTab === 'permissions' && 'Phân Quyền & Quản Lý Tài Khoản'}
              {activeTab === 'system-settings' && 'Cài Đặt Hệ Thống'}
              {activeTab === 'account' && 'Thông Tin Tài Khoản'}
            </span>

          </div>

          <span className="hidden" aria-hidden="true" />
        </header>
        <main className="flex-1 overflow-y-auto bg-[#f4f6f8] p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* 1. Tổng quan Dashboard */}
            {activeTab === 'overview' && (
              <DashboardOverview
                employees={employees}
                mediaPosts={mediaPosts}
                onNavigate={navigateToTab}
                summary={dashboardSummary}
                onPreviewMedia={(post) => {
                  setPreviewMediaPost(post);
                  navigateToTab('media');
                }}
              />
            )}

            {activeTab === 'account' && <AccountPage embedded initialAdminUser={sessionAccount} />}

            {/* 2. Danh sách Quản lý Nhân sự */}
            {activeTab === 'employees' && !isEmployeeTrashPage && (
              <EmployeeManagement
                employees={employees}
                total={employeeTotal}
                page={Number(employeeListParams.page) || 1}
                pageSize={Number(employeeListParams.limit) || 12}
                loadError={employeesLoadError}
                isLoading={areEmployeesLoading}
                onDeleteEmployee={handleDeleteEmployee}
                onFiltersChange={handleEmployeeFiltersChange}
                onPageChange={handleEmployeePageChange}
                selectedEmployeeForDossier={selectedDossierEmployee}
                onCloseDossier={() => setSelectedDossierEmployee(null)}
                onOpenDossier={(emp) => setSelectedDossierEmployee(emp)}
                onNavigateToAdd={() => navigateToTab('add-employee')}
                onNavigateToEdit={(employee) => router.push(`/admin/employees/${encodeURIComponent(employee.id)}/edit`)}
                onNavigateToTrash={() => router.push('/admin/employees/trash')}
              />
            )}

            {activeTab === 'employees' && isEmployeeTrashPage && (
              <EmployeeTrashPage
                onBack={() => router.push('/admin/employees')}
                onRestored={async () => {
                  await Promise.all([loadEmployees(), refreshDashboardSummary()]);
                }}
              />
            )}

            {/* 3. Trang Thêm Nhân Viên Mới (Có bản Xem Trước trực quan) */}
            {activeTab === 'add-employee' && (
              <AddEmployeePage
                onBack={() => navigateToTab('employees')}
                onSave={(newEmp) => {
                  handleAddEmployee(newEmp);
                  navigateToTab('employees');
                }}
                existingCount={employees.length}
              />
            )}

            {/* 4. Danh sách Quản lý Truyền thông */}
            {activeTab === 'edit-employee' && (
              isEditingEmployeeLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">\u0110ang t\u1ea3i h\u1ed3 s\u01a1 nh\u00e2n vi\u00ean...</div>
              ) : editingEmployee ? (
                <AddEmployeePage
                  key={editingEmployee.id}
                  mode="edit"
                  initialEmployee={editingEmployee}
                  onBack={() => router.push('/admin/employees')}
                  onSave={(updatedEmployee) => {
                    handleUpdateEmployee(updatedEmployee);
                    router.push('/admin/employees');
                  }}
                  existingCount={employees.length}
                />
              ) : (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                  {editingEmployeeError ?? '\u004b\u0068\u00f4\u006e\u0067 t\u00ec\u006d th\u1ea5\u0079 h\u1ed3 s\u01a1 nh\u00e2\u006e vi\u00ea\u006e.'}
                </div>
              )
            )}

            {activeTab === 'media' && (
              <MediaManagement
                mediaPosts={mediaPosts}
                onAddMedia={handleAddMedia}
                onUpdateMedia={handleUpdateMedia}
                onDeleteMedia={handleDeleteMedia}
                previewPost={previewMediaPost}
                onSelectPreview={(post) => setPreviewMediaPost(post)}
                onNavigateToAdd={() => navigateToTab('add-media')}
              />
            )}

            {/* 5. Trang Đăng Bài Viết Truyền Thông Mới (Có bản Xem Trước dạng thẻ / toàn bài) */}
            {activeTab === 'add-media' && (
              <AddMediaPage
                onBack={() => navigateToTab('media')}
                onSave={(newPost) => {
                  handleAddMedia(newPost);
                  navigateToTab('media');
                }}
              />
            )}

            {/* 6. Trang Phân Quyền Quản Lý & Duyệt Tài Khoản Đăng Ký */}
            {(activeTab === 'permissions' || activeTab === 'system-settings') && (
              <div className="space-y-5">
                {activeTab === 'permissions' && (
                  <nav aria-label="Dieu huong phan quyen" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
                    {([
                      ['accounts', 'T\u00e0i kho\u1ea3n'],
                      ['roles', 'Quy\u1ec1n \u0111\u00e3 t\u1ea1o'],
                      ['new-role', 'T\u1ea1o quy\u1ec1n m\u1edbi'],
                      ['trash', 'Th\u00f9ng r\u00e1c'],
                    ] as const).map(([page, label]) => (
                      <button
                        key={page}
                        type="button"
                        aria-current={accessControlPage === page ? 'page' : undefined}
                        onClick={() => router.push(ACCESS_CONTROL_PAGE_ROUTES[page])}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${accessControlPage === page ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </nav>
                )}

                <AccessControlTabs
                  activeTab={activeTab}
                  onNavigate={navigateToTab}
                  page={accessControlPage}
                  onNavigateToPage={(page) => router.push(ACCESS_CONTROL_PAGE_ROUTES[page])}
                  trashItems={trashItems.filter((item) => item.entityType !== 'employee')}
                  onAddTrashItem={addTrashItem}
                  onRemoveTrashItem={removeTrashItem}
                  onRestoreExternalTrashItem={restoreExternalTrashItem}
                />
              </div>
            )}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
