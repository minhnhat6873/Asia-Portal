"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import InternalSystemsMenu from "./InternalSystemsMenu";
import { getPublicSiteSettings } from "@/services/site-settings.service";
import UserSessionButton from "./UserSessionButton";
import NotificationBell from "./NotificationBell";
import { useUserSession } from "@/lib/userSession";

const navLinks = [
  { href: "/", label: "Trang chủ" },
  // internal: shown only to signed-in accounts (the API refuses guests as well).
  { href: "/employees", label: "Nhân viên", internal: true },
  { href: "/news", label: "Truyền thông" },
  { href: "/diagram", label: "Sơ đồ tổ chức", internal: true },

  { href: "/about-asia", label: "Về Á Châu" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsInternalSystems, setInternalSystemsEnabled] = useState(false);
  const signedIn = useUserSession().status === "user";
  const visibleLinks = navLinks.filter((link) => signedIn || !link.internal);
  const internalSystemsEnabled = signedIn && settingsInternalSystems;

  useEffect(() => {
    let controller: AbortController | null = null;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      void getPublicSiteSettings(request.signal).then((settings) => {
        if (!request.signal.aborted) setInternalSystemsEnabled(settings.internalSystemsEnabled === true);
      }).catch(() => { if (!request.signal.aborted) setInternalSystemsEnabled(false); });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("asia-site-settings-updated", refresh);
    return () => {
      controller?.abort(); window.clearInterval(timer);
      window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("asia-site-settings-updated", refresh);
    };
  }, [pathname]);

  const isActive = (href: string) => pathname === href;
  const closeMobileMenu = () => {
    setMobileOpen(false);
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
        <div className={`relative flex h-[88px] items-center gap-4 ${internalSystemsEnabled ? "" : "xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"}`}>
          <Link href="/" className="flex w-fit shrink-0 items-center" onClick={closeMobileMenu}>
            <Image
              src="/assets/images/asia-logo.png"
              alt="Asia Food & Beverage co.ltd"
              width={64}
              height={64}
              className="h-16 w-16 object-contain"
              priority
            />
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-4 xl:flex xl:-translate-x-6">
            <nav className="flex shrink-0 items-center gap-6 min-[1440px]:gap-9">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative whitespace-nowrap py-2 text-[17px] font-medium transition-colors ${
                    isActive(link.href) ? "font-semibold text-wana-green" : "text-gray-600 hover:text-wana-green"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-wana-green" />}
                </Link>
              ))}
            </nav>
            {internalSystemsEnabled ? <InternalSystemsMenu /> : null}
          </div>

          <div className={`ml-auto flex min-w-0 items-center justify-end gap-2 ${internalSystemsEnabled ? "" : "xl:w-full"}`}>
            {signedIn ? <NotificationBell /> : null}
            <UserSessionButton />
            <button
              type="button"
              aria-label="Mở menu"
              aria-expanded={mobileOpen}
              onClick={() => {
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
            <div className="flex h-[88px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
              <span className="text-[22px] font-bold text-slate-800">Menu</span>
              <button
                type="button"
                aria-label="Đóng menu"
                onClick={closeMobileMenu}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-5">
                {visibleLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={`flex min-h-14 items-center justify-between gap-3 rounded-xl px-4 text-lg font-bold transition-colors ${
                      isActive(link.href) ? "bg-wana-green-50 text-wana-green-dark" : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {internalSystemsEnabled ? <InternalSystemsMenu mobile /> : null}
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
