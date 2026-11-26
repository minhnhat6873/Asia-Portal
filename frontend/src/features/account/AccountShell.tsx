"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, CarFront, ChevronRight, Settings, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useUnreadNotificationCount } from "@/lib/notificationCount";

const ITEMS = [
  { href: "/user/account/profile", label: "Thông tin cá nhân", icon: UserRound },
  { href: "/user/account/meetings", label: "Lịch họp của tôi", icon: CalendarDays },
  { href: "/user/account/trips", label: "Chuyến xe của tôi", icon: CarFront },
  { href: "/user/account/notifications", label: "Thông báo", icon: Bell },
  { href: "/user/account/settings", label: "Cài đặt tài khoản", icon: Settings },
];

/** Shared frame for the signed-in account pages (the /user layout requires a signed-in account). */
export default function AccountShell({ title, description, action, badge, children }: { title: string; description?: string; /** Shown beside the title (e.g. a main button). */ action?: ReactNode; /** Small tag right after the title (e.g. "3 mới"). */ badge?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const unread = useUnreadNotificationCount();

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/user" className="hover:text-emerald-700">Trang chủ</Link>
          <ChevronRight aria-hidden="true" size={15} />
          <span className="font-semibold text-slate-800">{title}</span>
        </nav>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <nav aria-label="Tài khoản" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-sm lg:flex-col lg:overflow-visible">
              {ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                  >
                    <Icon aria-hidden="true" size={18} />
                    {label}
                    {href === "/user/account/notifications" && unread > 0 && (
                      <span className="ml-auto rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">{unread > 99 ? "99+" : unread}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section className="min-w-0">
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold tracking-tight text-[#0d5c0d]">{title}{badge}</h1>
                {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
              </div>
              {action && <div className="shrink-0">{action}</div>}
            </header>
            {children}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</div>;
}
