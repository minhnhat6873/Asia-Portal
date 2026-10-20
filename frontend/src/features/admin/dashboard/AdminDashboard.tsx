"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Employee, MediaPost, ActiveTab } from './types';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { EmployeeManagement } from './components/EmployeeManagement';
import { EmployeeTrashPage } from './components/EmployeeTrashPage';
import { MediaManagement } from './components/MediaManagement';
import { AddEmployeePage } from './components/AddEmployeePage';
import { AddMediaPage } from './components/AddMediaPage';
import { AccessControlTabs, type AccessControlPage } from '@/features/access-control/AccessControlTabs';
import { AccessControlHome } from '@/features/access-control/AccessControlHome';
import AccountPage from '@/features/admin/account/AccountPage';
import Image from 'next/image';
import Link from 'next/link';
import { clearAdminSession, getAdminSession, type AdminUser } from '@/lib/adminSession';
import { logoutAdmin } from '@/features/admin/login/auth.service';
import { ArrowLeft, ChevronDown, KeyRound, LoaderCircle, LogOut, Menu, ShieldCheck, UserRound } from 'lucide-react';
import { getDashboardSummary, type DashboardSummary } from './dashboard.service';
import { getAdminEmployee, getAdminEmployees, softDeleteAdminEmployee, type AdminEmployeeListParams, type AdminEmployeeResult } from '@/services/admin-employee.service';
import { toast } from 'sonner';
import { canAccessAdminPath, hasAdminPermission } from '@/lib/adminPermissions';
import { getAccounts } from '@/services/access-control.service';
import { getAdminMedia, getAdminMediaById, type AdminMediaListParams } from '@/services/admin-media.service';
import { MeetingManagement } from './components/MeetingManagement';

export const ADMIN_TAB_ROUTES: Record<ActiveTab, string> = {
  overview: '/admin/dashboard',
  meetings: '/admin/meetings',
  employees: '/admin/employees',
  'add-employee': '/admin/employees/new',
  'edit-employee': '/admin/employees',
  media: '/admin/media',
  'add-media': '/admin/media/new',
  'edit-media': '/admin/media',
  permissions: '/admin/access-control',
  'system-settings': '/admin/settings',
  account: '/admin/account',
};
const ACCESS_CONTROL_PAGE_ROUTES: Record<Exclude<AccessControlPage, "edit-role">, string> = {
  overview: '/admin/access-control',
  accounts: '/admin/access-control/accounts',
  'new-account': '/admin/access-control/accounts/new',
  roles: '/admin/access-control/roles',
  'new-role': '/admin/access-control/roles/new',
};


interface AdminDashboardProps {
  initialTab?: ActiveTab;
}

function getTabFromPath(pathname: string): ActiveTab {
  if (pathname === "/admin/employees/new") return "add-employee";
  if (/^\/admin\/employees\/[^/]+\/edit$/.test(pathname)) return "edit-employee";
  if (pathname.startsWith("/admin/employees")) return "employees";
  if (pathname === "/admin/media/new") return "add-media";
  if (/^\/admin\/media\/[^/]+\/edit$/.test(pathname)) return "edit-media";
  if (pathname.startsWith("/admin/media")) return "media";
  if (pathname.startsWith("/admin/meetings")) return "meetings";
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
    chartAvatar: employee.chartAvatar ?? "",
    joinDate: formatEmployeeDate(employee.joinDate),
    birthDate: formatEmployeeDate(employee.birthDate),
    gender: employee.gender,
    status: employee.status,
    bio: employee.description ?? "",
    createdBy: employee.createdBy,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

function getAccessControlPage(pathname: string): AccessControlPage {
  if (pathname === '/admin/access-control/accounts/new') return 'new-account';
  if (pathname === '/admin/access-control/roles/new') return 'new-role';
  if (/^\/admin\/access-control\/roles\/[^/]+\/edit$/.test(pathname)) return 'edit-role';
  if (pathname === '/admin/access-control/roles') return 'roles';
  if (pathname === '/admin/access-control/accounts') return 'accounts';
  return 'overview';
}


export default function AdminDashboard(_props: AdminDashboardProps) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const navigateToPage = (href: string) => {
    startNavigation(() => router.push(href));
  };
  const pathname = usePathname();
  const activeTab = getTabFromPath(pathname);
  const accessControlPage = getAccessControlPage(pathname);
  const editingRoleId = pathname.match(/^\/admin\/access-control\/roles\/([^/]+)\/edit$/)?.[1];
  const isEmployeeTrashPage = pathname === '/admin/employees/trash';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [employeeListParams, setEmployeeListParams] = useState<AdminEmployeeListParams>({ page: 1, limit: 10 });
  const [employeesLoadError, setEmployeesLoadError] = useState<string | null>(null);
  const [areEmployeesLoading, setAreEmployeesLoading] = useState(true);
  const editingEmployeeId = pathname.match(/^\/admin\/employees\/([^/]+)\/edit$/)?.[1];
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEditingEmployeeLoading, setIsEditingEmployeeLoading] = useState(false);
  const [editingEmployeeError, setEditingEmployeeError] = useState<string | null>(null);
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaListParams, setMediaListParams] = useState<AdminMediaListParams>({ page: 1, limit: 10, sort: 'latest' });
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);
  const [areMediaLoading, setAreMediaLoading] = useState(true);
  const editingMediaId = pathname.match(/^\/admin\/media\/([^/]+)\/edit$/)?.[1];
  const [editingMedia, setEditingMedia] = useState<MediaPost | null>(null);
  const [isEditingMediaLoading, setIsEditingMediaLoading] = useState(Boolean(editingMediaId));
  const [editingMediaError, setEditingMediaError] = useState<string | null>(null);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [sessionAccount, setSessionAccount] = useState<AdminUser | null>(getAdminSession);
  const canViewEmployees = hasAdminPermission(sessionAccount, 'employees:view');
  const canViewMedia = hasAdminPermission(sessionAccount, 'media:view');
  const canViewDashboard = hasAdminPermission(sessionAccount, 'dashboard:view');
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const isPageLoading = isNavigating
    || (activeTab === 'overview' && (isSummaryLoading || areEmployeesLoading || areMediaLoading))
    || (activeTab === 'employees' && !isEmployeeTrashPage && areEmployeesLoading)
    || (activeTab === 'media' && areMediaLoading)
    || (activeTab === 'edit-employee' && isEditingEmployeeLoading)
    || (activeTab === 'edit-media' && isEditingMediaLoading);

  useLayoutEffect(() => {
    const desktop = window.matchMedia('(min-width: 992px)');
    const syncSidebarWithViewport = () => setIsSidebarOpen(desktop.matches);
    syncSidebarWithViewport();
    desktop.addEventListener('change', syncSidebarWithViewport);
    return () => desktop.removeEventListener('change', syncSidebarWithViewport);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (!window.matchMedia('(min-width: 992px)').matches) setIsSidebarOpen(false);
      setIsAccountMenuOpen(false);
    });
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !window.matchMedia('(min-width: 992px)').matches) setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!editingEmployeeId || !canViewEmployees) {
      queueMicrotask(() => { setEditingEmployee(null); setEditingEmployeeError(null); setIsEditingEmployeeLoading(false); });
      return;
    }

    const employeeId = decodeURIComponent(editingEmployeeId);
    if (!/^[a-f\d]{24}$/i.test(employeeId)) {
      queueMicrotask(() => { setEditingEmployee(null); setEditingEmployeeError("Không tìm thấy hồ sơ nhân viên trên hệ thống."); setIsEditingEmployeeLoading(false); });
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) { setIsEditingEmployeeLoading(true); setEditingEmployeeError(null); } });

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
  }, [editingEmployeeId, canViewEmployees]);

  useEffect(() => {
    if (!editingMediaId || !canViewMedia) return;
    const controller = new AbortController();
    void getAdminMediaById(decodeURIComponent(editingMediaId), controller.signal)
      .then(setEditingMedia)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setEditingMedia(null);
          setEditingMediaError(error instanceof Error ? error.message : "Không thể tải bài viết.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setIsEditingMediaLoading(false); });
    return () => controller.abort();
  }, [editingMediaId, canViewMedia]);

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
    if (!canViewEmployees) { setEmployees([]); setAreEmployeesLoading(false); return; }
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
  }, [employeeListParams, canViewEmployees]);

  const loadMedia = useCallback(async (signal?: AbortSignal) => {
    if (!canViewMedia) { setMediaPosts([]); setAreMediaLoading(false); return; }
    try {
      const result = await getAdminMedia(mediaListParams, signal);
      setMediaPosts(result.items);
      setMediaTotal(result.pagination.total);
      setMediaLoadError(null);
    } catch (error) {
      if (!signal?.aborted) {
        setMediaPosts([]);
        setMediaTotal(0);
        setMediaLoadError(error instanceof Error ? error.message : "Không thể tải danh sách truyền thông.");
      }
    } finally {
      if (!signal?.aborted) setAreMediaLoading(false);
    }
  }, [mediaListParams, canViewMedia]);

  const refreshDashboardSummary = useCallback(async (signal?: AbortSignal) => {
    if (!canViewDashboard) { setIsSummaryLoading(false); return; }
    try {
      const summary = await getDashboardSummary(signal);
      setDashboardSummary(summary);
    } catch {
      if (!signal?.aborted) setDashboardSummary(null);
    } finally {
      if (!signal?.aborted) setIsSummaryLoading(false);
    }
  }, [canViewDashboard]);

  const handleEmployeeFiltersChange = useCallback((filters: AdminEmployeeListParams) => {
    setEmployeeListParams({ ...filters, page: 1, limit: 10 });
  }, []);

  const handleEmployeePageChange = useCallback((page: number) => {
    setEmployeeListParams((current) => ({ ...current, page }));
  }, []);

  const handleMediaFiltersChange = useCallback((filters: AdminMediaListParams) => {
    setAreMediaLoading(true);
    setMediaListParams({ ...filters, page: 1, limit: 10 });
  }, []);

  const handleMediaPageChange = useCallback((page: number) => {
    setAreMediaLoading(true);
    setMediaListParams((current) => ({ ...current, page }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void loadEmployees(controller.signal); });
    return () => controller.abort();
  }, [loadEmployees]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void loadMedia(controller.signal));
    return () => controller.abort();
  }, [loadMedia]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void refreshDashboardSummary(controller.signal); });

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

  useEffect(() => {
    if (sessionAccount?.role !== 'Toàn quyền Admin') return;
    let active = true;
    void getAccounts().then((accounts) => { if (active) setPendingUsersCount(accounts.filter((account) => account.status === 'pending').length); }).catch(() => {});
    return () => { active = false; };
  }, [sessionAccount?.role]);

  const navigateToTab = (tab: ActiveTab) => {
    const target = ADMIN_TAB_ROUTES[tab];
    navigateToPage(canAccessAdminPath(sessionAccount, target) ? target : "/admin/account");
    if (!window.matchMedia('(min-width: 992px)').matches) setIsSidebarOpen(false);
  };
  // Helper toast notifier
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const notify = type === 'success' ? toast.success : type === 'error' ? toast.error : toast.info;
    notify(message);
  };

  // --- EMPLOYEE CRUD ---
  const handleAddEmployee = (newEmpData: Employee) => {
    const newEmployee = newEmpData;
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
    if (!empToDelete || !hasAdminPermission(sessionAccount, 'employees:delete')) return false;

    const loadingToastId = toast.loading('Đang xóa nhân viên, vui lòng chờ trong giây lát...');

    {
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
  const handleAddMedia = (newPost: MediaPost) => {
    setMediaPosts((items) => [newPost, ...items]);
    setMediaTotal((total) => total + 1);
    void refreshDashboardSummary();
    addToast(`Đã lưu bài viết truyền thông "${newPost.title.slice(0, 32)}..." thành công!`);
  };

  const handleUpdateMedia = (updatedPost: MediaPost) => {
    setMediaPosts((items) => items.map((post) => post.id === updatedPost.id ? updatedPost : post));
    if (previewMediaPost?.id === updatedPost.id) {
      setPreviewMediaPost(updatedPost);
    }
    void refreshDashboardSummary();
  };

  const handleDeleteMedia = (id: string) => {
    setMediaPosts((items) => items.filter((post) => post.id !== id));
    setMediaTotal((total) => Math.max(0, total - 1));
    if (previewMediaPost?.id === id) {
      setPreviewMediaPost(null);
    }
    void refreshDashboardSummary();
  };

  return (
    <div className="admin-shell relative flex h-dvh min-h-0 flex-col overflow-hidden bg-admin-main font-sans text-slate-800">
      {/* Toast notifications */}
      <header className={`flex shrink-0 items-center justify-between bg-white px-4 sm:px-6 lg:px-8 ${activeTab === 'meetings' ? 'h-[60px]' : 'h-[76px]'}`}>
          <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-2 rounded-xl sm:gap-3 outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-emerald-500">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center">
            <Image src="/assets/images/asia-logo.png" alt="Asia Food & Beverage co.ltd" width={48} height={48} className="h-12 w-12 object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black leading-tight tracking-[-0.035em] text-[#082c5c] sm:text-lg">Asia Food &amp; Beverage co.ltd</span>
            <span className="mt-1 block truncate text-[11px] font-semibold leading-[1.3] tracking-[-0.015em] text-[#00865a] sm:text-sm">Cổng quản trị nội bộ</span>
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
            <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/15">
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
                <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); navigateToPage("/admin/account"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800">
                  <UserRound className="h-4 w-4 text-slate-500" />Hồ sơ cá nhân
                </button>
                <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); navigateToPage("/admin/account?tab=password"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800">
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
        inert={!isSidebarOpen}
        aria-hidden={!isSidebarOpen}
        className={`h-full shrink-0 transition-[width] duration-300 ease-in-out ${
          isSidebarOpen ? 'overflow-visible' : 'overflow-hidden'
        } ${
        isSidebarOpen ? 'w-64 max-w-[85vw] max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:shadow-2xl' : 'w-0'
        }`}
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            navigateToTab(tab);
            if (!window.matchMedia('(min-width: 992px)').matches) setIsSidebarOpen(false);
          }}
          employeeCount={dashboardSummary?.totalEmployees ?? employeeTotal}
          mediaCount={dashboardSummary?.totalMediaPosts ?? mediaTotal}
          pendingUsersCount={pendingUsersCount}
          canViewMeetings={sessionAccount?.role === "Toàn quyền Admin" || sessionAccount?.permissions.includes("meetings:view") === true}
          compact={false}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Đóng thanh điều hướng"
          onClick={() => setIsSidebarOpen(false)}
          className="absolute inset-0 z-30 bg-slate-950/35 lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <main id="admin-main" className="min-w-0 h-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-admin-main">
        {/* Topbar — back to the public portal + account dropdown */}
        <header className={`shrink-0 items-center justify-between gap-3 bg-transparent px-4 md:px-6 ${activeTab === 'meetings' ? 'flex h-14 lg:hidden' : 'flex h-16'}`}>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-label={isSidebarOpen ? 'Ẩn thanh điều hướng' : 'Mở thanh điều hướng'}
              aria-expanded={isSidebarOpen}
              aria-controls="admin-navigation"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden ${
                isSidebarOpen
                  ? 'bg-transparent text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_0_12px_rgba(22,163,74,0.20)]'
                  : 'bg-transparent text-emerald-700 hover:bg-emerald-50 hover:shadow-[0_0_12px_rgba(22,163,74,0.24)]'
              }`}
            >
              <Menu className="h-[21px] w-[21px]" />
            </button>

            {activeTab === 'permissions' && (accessControlPage === 'roles' || accessControlPage === 'accounts' || accessControlPage === 'new-role' || accessControlPage === 'new-account') && (
              <Link
                href={accessControlPage === 'new-account' ? '/admin/access-control/accounts' : '/admin/access-control'}
                aria-label={accessControlPage === 'new-account' ? 'Quay lại quản lý tài khoản' : 'Quay lại phân quyền và quản lý tài khoản'}
                title="Quay lại"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}

            {/* Section title for the active tab */}
            <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-[0.04em] text-slate-800 sm:text-lg [&>span]:hidden [&>span]:shrink-0 lg:[&>span]:inline-block">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.65)]" />
              {activeTab === 'overview' && 'Bảng Điều Khiển'}
              {activeTab === 'employees' && (isEmployeeTrashPage ? 'Thùng Rác Nhân Viên' : 'Quản Lý Nhân Sự')}
              {activeTab === 'add-employee' && 'Thêm Nhân Viên Mới'}
              {activeTab === 'media' && 'Quản Lý Truyền Thông'}
              {activeTab === 'meetings' && 'Quản Lý Đặt Phòng Họp'}
              {activeTab === 'add-media' && 'Đăng Tin Truyền Thông'}
              {activeTab === 'edit-media' && 'Chỉnh Sửa Tin Truyền Thông'}
              {activeTab === 'permissions' && ({ overview: 'Phân Quyền & Quản Lý Tài Khoản', accounts: 'Quản Lý Tài Khoản', 'new-account': 'Thêm Tài Khoản', roles: 'Nhóm Quyền Đã Tạo', 'new-role': 'Tạo Nhóm Quyền', 'edit-role': 'Chỉnh Sửa Nhóm Quyền' }[accessControlPage])}
              {activeTab === 'system-settings' && 'Cài Đặt Hệ Thống'}
              {activeTab === 'account' && 'Thông Tin Tài Khoản'}
            </span>

          </div>

          <span className="hidden" aria-hidden="true" />
        </header>
        {isPageLoading && (
          <div role="status" aria-live="polite" className="flex min-h-64 items-center justify-center gap-2.5 text-sm text-slate-500">
            <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-emerald-600 motion-reduce:animate-none" />
            <span>Đang tải trang...</span>
          </div>
        )}
        <div hidden={isPageLoading} className={activeTab === 'meetings' ? 'p-3 sm:p-4 lg:p-[18px]' : 'p-3 sm:p-4 md:p-6 lg:p-8'}>
          <div className={activeTab === 'meetings' ? 'mx-0 w-full min-w-0 max-w-none' : 'mx-auto w-full min-w-0 max-w-7xl'}>
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
                pageSize={Number(employeeListParams.limit) || 10}
                loadError={employeesLoadError}
                isLoading={areEmployeesLoading}
                onDeleteEmployee={handleDeleteEmployee}
                onFiltersChange={handleEmployeeFiltersChange}
                onPageChange={handleEmployeePageChange}
                selectedEmployeeForDossier={selectedDossierEmployee}
                onCloseDossier={() => setSelectedDossierEmployee(null)}
                onOpenDossier={(emp) => setSelectedDossierEmployee(emp)}
                onNavigateToAdd={() => navigateToTab('add-employee')}
                onNavigateToEdit={(employee) => navigateToPage(`/admin/employees/${encodeURIComponent(employee.id)}/edit`)}
                onNavigateToTrash={() => navigateToPage('/admin/employees/trash')}
                onChartAvatarUpdated={() => loadEmployees()}
              />
            )}

            {activeTab === 'employees' && isEmployeeTrashPage && (
              <EmployeeTrashPage
                onBack={() => navigateToPage('/admin/employees')}
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
                  onBack={() => navigateToPage('/admin/employees')}
                  onSave={(updatedEmployee) => {
                    handleUpdateEmployee(updatedEmployee);
                    navigateToPage('/admin/employees');
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
                total={mediaTotal}
                page={Number(mediaListParams.page) || 1}
                pageSize={Number(mediaListParams.limit) || 10}
                isLoading={areMediaLoading}
                loadError={mediaLoadError}
                onFiltersChange={handleMediaFiltersChange}
                onPageChange={handleMediaPageChange}
                onReload={() => {
                  setAreMediaLoading(true);
                  void loadMedia();
                }}
                onUpdated={handleUpdateMedia}
                onDeleted={handleDeleteMedia}
                previewPost={previewMediaPost}
                onSelectPreview={(post) => setPreviewMediaPost(post)}
                onNavigateToAdd={() => navigateToTab('add-media')}
                onNavigateToEdit={(post) => navigateToPage(`/admin/media/${encodeURIComponent(post.id)}/edit`)}
              />
            )}

            {activeTab === 'meetings' && (
              sessionAccount?.role === "Toàn quyền Admin" || sessionAccount?.permissions.includes("meetings:view") ? (
                <MeetingManagement permissions={sessionAccount.role === "Toàn quyền Admin" ? ["meetings:view", "meetings:create", "meetings:update", "meetings:delete"] : sessionAccount.permissions} />
              ) : (
                <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-medium text-amber-800">Tài khoản chưa được cấp quyền xem lịch họp.</div>
              )
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

            {activeTab === 'edit-media' && (
              isEditingMediaLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Đang tải bài viết...</div>
              ) : editingMedia ? (
                <AddMediaPage
                  key={editingMedia.id}
                  mode="edit"
                  initialPost={editingMedia}
                  onBack={() => navigateToPage('/admin/media')}
                  onSave={(updatedPost) => {
                    handleUpdateMedia(updatedPost);
                    navigateToPage('/admin/media');
                  }}
                />
              ) : (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{editingMediaError ?? 'Không tìm thấy bài viết.'}</div>
              )
            )}

            {/* 6. Trang Phân Quyền Quản Lý & Duyệt Tài Khoản Đăng Ký */}
            {(activeTab === 'permissions' || activeTab === 'system-settings') && (
              accessControlPage === 'overview' ? <AccessControlHome /> : (
                <AccessControlTabs
                  activeTab={activeTab}
                  page={accessControlPage}
                  editingRoleId={editingRoleId}
                  onNavigateToPage={(page) => navigateToPage(ACCESS_CONTROL_PAGE_ROUTES[page])}
                  onAccountsChanged={setPendingUsersCount}
                />
              )
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
