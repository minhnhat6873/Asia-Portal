"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  Users,
  Newspaper,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Settings,
  LogOut,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { AdminUser, clearAdminSession, getAdminSession } from '@/lib/adminSession';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  employeeCount: number;
  mediaCount: number;
  /** Registrations awaiting approval — drives the badge on "Phân quyền quản lý". */
  pendingUsersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  employeeCount,
  mediaCount,
  pendingUsersCount = 0,
}) => {
  const router = useRouter();
  const [account, setAccount] = useState<AdminUser | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setAccount(getAdminSession());
    sync();
    window.addEventListener("asia-admin-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("asia-admin-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const closeMenu = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false);
    };

    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAccountMenuOpen]);

  const handleLogout = () => {
    clearAdminSession();
    router.push('/admin/login');
  };

  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Bảng điều khiển',
      icon: LayoutDashboard,
      badge: null,
      isPendingBadge: false,
    },
    {
      id: 'employees' as ActiveTab,
      label: 'Quản lý Nhân sự',
      icon: Users,
      badge: employeeCount,
      isPendingBadge: false,
    },
    {
      id: 'media' as ActiveTab,
      label: 'Quản lý Truyền thông',
      icon: Newspaper,
      badge: mediaCount,
      isPendingBadge: false,
    },
    {
      id: 'permissions' as ActiveTab,
      label: 'Phân quyền quản lý',
      icon: UserCheck,
      badge: pendingUsersCount > 0 ? pendingUsersCount : null,
      isPendingBadge: pendingUsersCount > 0,
    },
  ];

  return (
    <aside className="h-full w-64 bg-[#060806] text-slate-300 flex flex-col shrink-0 border-r border-white/10 select-none">
      {/* Brand Header — Asia F&B logo on the black canvas, gold-ringed */}
      <div className="border-b border-white/[0.08] px-5 py-5">
        <div className="flex items-center gap-3.5">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#060806]">
            <Image
              src="/assets/images/asia-logo.png"
              alt="Asia Food & Beverage"
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 overflow-hidden">
            <h1 className="truncate text-[15px] font-bold leading-tight tracking-[-0.01em] text-white">
              Asia F&B Beverage
            </h1>
            <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] font-medium text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Admin Control Portal
            </p>
          </div>
        </div>

        {/* Live Site Link Pill */}
        <a
          href="https://asia-q5di.onrender.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-4 flex items-center justify-between rounded-xl border border-white/[0.10] bg-white/[0.035] px-3 py-2.5 text-xs text-emerald-400 transition-all duration-200 hover:border-emerald-400/35 hover:bg-emerald-400/[0.08] hover:text-emerald-300"
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="truncate font-medium">asia-q5di.onrender.com</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="border-b border-white/[0.10] px-4 pb-3 pt-1 text-[10px] font-bold uppercase tracking-wide text-sky-400">
          Danh mục quản lý
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'employees' && activeTab === 'add-employee') ||
            (item.id === 'media' && activeTab === 'add-media');
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#0d5c0d] to-[#1a7a1a] text-white font-semibold shadow-sm shadow-[#1a7a1a]/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
              >
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : item.isPendingBadge ? 'text-[#f5c800]' : 'text-slate-400'}`} />
                  {item.isPendingBadge && (
                    <span
                      className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#060806] bg-rose-500"
                      title={`${item.badge} tài khoản chờ duyệt`}
                    />
                  )}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge !== null && !item.isPendingBadge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    item.isPendingBadge
                      ? 'bg-[#f5c800] text-[#1a1a1a] animate-pulse'
                      : isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white/[0.08] text-slate-400'
                  }`}
                  title={item.isPendingBadge ? `${item.badge} tài khoản chờ duyệt` : undefined}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <p className="shrink-0 px-7 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-sky-400">
        Support
      </p>

      {/* Footer account actions and profile */}
      <div className="mt-2 shrink-0 border-t border-white/[0.10] bg-black/30 px-4 pb-4 pt-3">
        <div className="space-y-1 px-3 py-1">
          <button
            type="button"
            onClick={() => onTabChange('system-settings')}
            className={`group flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all duration-200 ${
              activeTab === 'system-settings'
                ? 'bg-emerald-500/[0.12] text-white shadow-[0_0_14px_rgba(34,197,94,0.24)]'
                : 'text-slate-100 hover:bg-emerald-500/[0.12] hover:text-white hover:shadow-[0_0_14px_rgba(34,197,94,0.24)]'
            }`}
          >
            <Settings className="h-4 w-4 text-emerald-400 transition-colors group-hover:text-emerald-300" />
            Cài đặt hệ thống
          </button>
          <Link
            href="/admin/account"
            className="group flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-100 transition-all duration-200 hover:bg-emerald-500/[0.12] hover:text-white hover:shadow-[0_0_14px_rgba(34,197,94,0.24)]"
          >
            <User className="h-4 w-4 text-emerald-400 transition-colors group-hover:text-emerald-300" />
            Thông tin tài khoản
          </Link>
        </div>

        <div ref={accountMenuRef} className="relative mt-3">
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-emerald-500/[0.12] hover:shadow-[0_0_14px_rgba(34,197,94,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#060806]">
              <Image
                src="/assets/images/asia-logo.png"
                alt="Asia F&B Beverage"
                fill
                sizes="36px"
                className="object-cover"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">{account?.fullName ?? 'admin'}</span>
              <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#4ade80]">
                <ShieldCheck className="h-3 w-3 shrink-0" /> {account?.role ?? 'Toàn quyền Admin'}
              </span>
            </span>
          </button>

          {isAccountMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 z-50 mb-2 w-full rounded-xl border border-white/10 bg-[#0c100c] p-2 shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
