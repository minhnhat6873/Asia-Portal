"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutDashboard, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import InternalSystemsMenu from "./InternalSystemsMenu";

const navLinks = [
  { href: "/", label: "Trang chủ" },
  { href: "/employees", label: "Nhân viên" },
  { href: "/news", label: "Truyền thông" },
  { href: "/welcome", label: "Chào mừng" },
  { href: "/about-wana", label: "Về Á Châu" },
];

const internalSystems = [
  { label: "CRM", description: "Quản lý khách hàng", href: "https://wana.vn/crm" },
  { label: "Wiki", description: "Kho kiến thức nội bộ", href: "https://wiki.wana.vn" },
  { label: "LMS", description: "Đào tạo & học tập", href: "https://wana.vn/lms" },
  { label: "ERP", description: "Quản lý doanh nghiệp", href: "https://wana.vn/app/home" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"main" | "systems">("main");

  const isActive = (href: string) => pathname === href;
  const closeMobileMenu = () => {
    setMobileOpen(false);
    setMobileView("main");
  };

  useEffect(() => {
    if (!mobileOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative flex h-16 items-center sm:h-20">
          <Link href="/" className="flex shrink-0 items-center gap-2" onClick={closeMobileMenu}>
            <Image
              src="/assets/images/asia-logo.png"
              alt="Asia Food & Beverage JSC"
              width={56}
              height={56}
              className="h-11 w-11 object-contain sm:h-14 sm:w-14"
              priority
            />
            <span className="hidden sm:block font-bold text-xl text-wana-green-dark tracking-tight">
              
            </span>
          </Link>

          <div className="absolute left-1/2 hidden w-max -translate-x-1/2 items-center gap-1 xl:flex">
            <nav className="flex shrink-0 items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative whitespace-nowrap px-4 py-2 text-base font-medium transition-all ${
                    isActive(link.href) ? "font-semibold text-wana-green" : "text-gray-600 hover:text-wana-green"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-wana-green" />}
                </Link>
              ))}
            </nav>
            <InternalSystemsMenu />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="Mở menu"
              aria-expanded={mobileOpen}
              onClick={() => {
                setMobileView("main");
                setMobileOpen(true);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-wana-green-dark transition-colors hover:bg-wana-green-50 xl:hidden"
            >
              <Menu size={25} />
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={closeMobileMenu}
            className="absolute inset-0 cursor-default bg-slate-950/45"
          />
          <aside className="relative flex h-full w-[min(88vw,360px)] flex-col bg-white shadow-[12px_0_32px_rgba(15,23,42,0.2)]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
              {mobileView === "systems" ? (
                <button
                  type="button"
                  onClick={() => setMobileView("main")}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-wana-green-dark"
                >
                  <ChevronLeft size={19} /> Quay lại
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <Image src="/assets/images/asia-logo.png" alt="Asia Food & Beverage JSC" width={40} height={40} className="h-10 w-10 object-contain" />
                  <span className="font-bold text-lg text-wana-green-dark">asiafnbbeverage</span>
                </div>
              )}
              <button
                type="button"
                aria-label="Đóng menu"
                onClick={closeMobileMenu}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"
              >
                <X size={24} />
              </button>
            </div>

            {mobileView === "main" ? (
              <nav className="flex flex-1 flex-col px-3 py-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={`flex min-h-14 items-center rounded-xl px-3 text-base font-semibold transition-colors ${
                      isActive(link.href) ? "bg-wana-green-50 text-wana-green-dark" : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="my-3 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => setMobileView("systems")}
                  className="flex min-h-14 items-center justify-between rounded-xl px-3 text-left text-base font-bold text-wana-green-dark transition-colors hover:bg-wana-green-50"
                >
                  Hệ thống nội bộ Wana
                  <ChevronRight size={20} />
                </button>
                <Link
                  href="/admin"
                  onClick={closeMobileMenu}
                  className="flex min-h-14 items-center justify-between rounded-xl px-3 text-left text-base font-bold text-wana-green-dark transition-colors hover:bg-wana-green-50"
                >
                  Trang quản trị hệ thống
                  <LayoutDashboard size={20} />
                </Link>
              </nav>
            ) : (
              <div className="flex flex-1 flex-col px-3 py-3">
                <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-wana-green">Hệ thống nội bộ</p>
                {internalSystems.map((system) => (
                  <a
                    key={system.label}
                    href={system.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={closeMobileMenu}
                    className="flex min-h-16 items-center rounded-xl px-3 transition-colors hover:bg-wana-green-50"
                  >
                    <span>
                      <span className="block text-base font-bold text-slate-800">{system.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{system.description}</span>
                    </span>
                  </a>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </header>
  );
}