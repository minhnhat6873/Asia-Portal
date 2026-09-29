"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  getStoredEmployees,
  saveStoredEmployees,
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
import { MediaManagement } from './components/MediaManagement';
import { AddEmployeePage } from './components/AddEmployeePage';
import { AddMediaPage } from './components/AddMediaPage';
import { DEFAULT_ROLE_PERMISSIONS, PermissionsManagement } from './components/PermissionsManagement';
import { AccessControlTabs } from '@/features/access-control/AccessControlTabs';
import AccountPage from '@/features/admin/account/AccountPage';
import { Toast, ToastMessage } from './components/Toast';
import Image from 'next/image';
import Link from 'next/link';
import { getAdminSession, type AdminUser } from '@/lib/adminSession';
import { subscribePortalContent } from '@/lib/portalContent';
import { Menu, ShieldCheck } from 'lucide-react';

export const ADMIN_TAB_ROUTES: Record<ActiveTab, string> = {
  overview: '/admin/dashboard',
  employees: '/admin/employees',
  'add-employee': '/admin/employees/new',
  media: '/admin/media',
  'add-media': '/admin/media/new',
  permissions: '/admin/access-control',
  'system-settings': '/admin/settings',
  account: '/admin/account',
};

interface AdminDashboardProps {
  initialTab: ActiveTab;
}

export default function AdminDashboard({ initialTab }: AdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(null);
  const [sessionAccount, setSessionAccount] = useState<AdminUser | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
  // Modal & Navigation triggers
  const [selectedDossierEmployee, setSelectedDossierEmployee] = useState<Employee | null>(null);
  const [previewMediaPost, setPreviewMediaPost] = useState<MediaPost | null>(null);

  // Initialize data from localStorage, then stay in step with any other tab
  // that edits the same store (e.g. a second admin dashboard window).
  useEffect(() => {
    const load = () => {
      setEmployees(getStoredEmployees());
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
      setTrashItems(getStoredTrashItems());
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
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
  const handleAddEmployee = (newEmpData: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = {
      ...newEmpData,
      id: `emp-${Date.now()}`,
    };
    const updated = [newEmployee, ...employees];
    setEmployees(updated);
    saveStoredEmployees(updated);
    addToast(`Đã thêm nhân viên ${newEmployee.fullName} (${newEmployee.code}) thành công!`);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const updated = employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e));
    setEmployees(updated);
    saveStoredEmployees(updated);
    if (selectedDossierEmployee?.id === updatedEmp.id) {
      setSelectedDossierEmployee(updatedEmp);
    }
    addToast(`Đã cập nhật thông tin nhân viên ${updatedEmp.fullName}!`);
  };

  const handleDeleteEmployee = (id: string) => {
    const empToDelete = employees.find((e) => e.id === id);
    if (!empToDelete) return;
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    saveStoredEmployees(updated);
    if (selectedDossierEmployee?.id === id) {
      setSelectedDossierEmployee(null);
    }
    addTrashItem({ entityType: 'employee', title: empToDelete.fullName, payload: empToDelete });
    addToast(`Đã xóa nhân viên ${empToDelete?.fullName || ''} khỏi hệ thống.`, 'info');
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
    addToast(`Đã đăng bài viết truyền thông "${newPost.title.slice(0, 32)}..." thành công!`);
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

  const restoreExternalTrashItem = (item: TrashItem) => {
    if (item.entityType === 'employee') {
      const employee = item.payload as Employee;
      setEmployees((items) => {
        const next = items.some((entry) => entry.id === employee.id) ? items : [employee, ...items];
        saveStoredEmployees(next);
        return next;
      });
      addToast(`Đã khôi phục nhân sự ${employee.fullName}.`);
      return;
    }
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
      <Toast toasts={toasts} onDismiss={removeToast} />

      <header className="flex h-[76px] shrink-0 items-center justify-between bg-white px-4 shadow-sm sm:px-6 lg:px-8">
          <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-emerald-500">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50 shadow-sm">
            <Image src="/assets/images/asia-logo.png" alt="Asia Food & Beverage" width={44} height={44} className="h-9 w-9 object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-extrabold text-slate-900 sm:text-[15px]">Asia Food &amp; Beverage</span>
            <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Cổng quản trị nội bộ</span>
          </span>
        </Link>
        <Link href="/admin/account" className="group flex items-center gap-3 rounded-2xl px-2 py-1.5 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-[#0d5c0d] text-sm font-black text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-100">
            {sessionAccount?.initials ?? "AF"}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-44 truncate text-[13px] font-bold text-slate-900">{sessionAccount?.fullName ?? "Chưa đăng nhập"}</span>
            <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-emerald-700"><ShieldCheck className="h-3.5 w-3.5 shrink-0" />{sessionAccount?.role ?? "Tài khoản nội bộ"}</span>
          </span>
        </Link>
      </header>

      <div aria-hidden="true" className="h-px w-full shrink-0 bg-black/25" />

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
          employeeCount={employees.length}
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
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
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
            <span className="hidden items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-700 lg:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.65)]" />
              {activeTab === 'overview' && 'Bảng Điều Khiển'}
              {activeTab === 'employees' && 'Quản Lý Nhân Sự'}
              {activeTab === 'add-employee' && 'Thêm Nhân Viên Mới'}
              {activeTab === 'media' && 'Quản Lý Truyền Thông'}
              {activeTab === 'add-media' && 'Đăng Tin Truyền Thông'}
              {activeTab === 'permissions' && 'Phân Quyền & Quản Lý Tài Khoản'}
              {activeTab === 'system-settings' && 'Cài Đặt Hệ Thống'}
            </span>

          </div>

          <span className="hidden" aria-hidden="true" />
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* 1. Tổng quan Dashboard */}
            {activeTab === 'overview' && (
              <DashboardOverview
                employees={employees}
                mediaPosts={mediaPosts}
                users={users}
                onNavigate={navigateToTab}
                onOpenAddEmployee={() => navigateToTab('add-employee')}
                onOpenAddMedia={() => navigateToTab('add-media')}
                onPreviewMedia={(post) => {
                  setPreviewMediaPost(post);
                  navigateToTab('media');
                }}
              />
            )}

            {activeTab === 'account' && <AccountPage embedded />}

            {/* 2. Danh sách Quản lý Nhân sự */}
            {activeTab === 'employees' && (
              <EmployeeManagement
                employees={employees}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                selectedEmployeeForDossier={selectedDossierEmployee}
                onCloseDossier={() => setSelectedDossierEmployee(null)}
                onOpenDossier={(emp) => setSelectedDossierEmployee(emp)}
                onNavigateToAdd={() => navigateToTab('add-employee')}
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
              <AccessControlTabs
                activeTab={activeTab}
                onNavigate={navigateToTab}
                trashItems={trashItems}
                onAddTrashItem={addTrashItem}
                onRemoveTrashItem={removeTrashItem}
                onRestoreExternalTrashItem={restoreExternalTrashItem}
              />
            )}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}



