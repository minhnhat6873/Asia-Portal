"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AdminUser,
  clearAdminSession,
  getAdminSession,
} from "@/lib/adminSession";

export default function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setUser(getAdminSession());
    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("asia-admin-session", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("asia-admin-session", sync);
    };
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!user) return null;

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-slate-100">
      <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full">
        <Image
          src="/assets/images/asia-logo.png"
          alt="Asia F&B Beverage"
          fill
          sizes="36px"
          className="object-contain"
        />
      </span>
      <span className="min-w-0 truncate text-sm font-semibold text-wana-green-dark">
        {user.fullName}
      </span>
      </button>
      {isOpen && <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
        <button type="button" role="menuitem" onClick={() => { clearAdminSession(); router.push('/admin/login'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" />Đăng xuất</button>
      </div>}
    </div>
  );
}
