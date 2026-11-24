"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, CarFront, ChevronRight, Settings, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useUnreadNotificationCount } from "@/lib/notificationCount";

const ITEMS = [
  { href: "/account/profile", label: "Thông tin cá nhân", icon: UserRound },
  { href: "/account/meetings", label: "Lịch họp của tôi", icon: CalendarDays },
  { href: "/account/trips", label: "Chuyến xe của tôi", icon: CarFront },
  { href: "/account/notifications", label: "Thông báo", icon: Bell },
  { href: "/account/settings", label: "Cài đặt tài khoản", icon: Settings },
];

/** Shared frame for the signed-in account pages (wrapped in LoginRequired by each route). */
export default function AccountShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const pathname = usePathname();
  const unread = useUnreadNotificationCount();

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-emerald-700">Trang chủ</Link>
          <ChevronRight aria-hidden="true" size={15} />
          <span className="font-semibold text-slate-800">{title}</span>
        </nav>
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside>
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
                    {href === "/account/notifications" && unread > 0 && (
                      <span className="ml-auto rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">{unread > 99 ? "99+" : unread}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section className="min-w-0">
            <header className="mb-5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#0d5c0d]">{title}</h1>
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
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
