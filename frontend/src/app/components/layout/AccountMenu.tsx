"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AdminUser,
  getAdminSession,
} from "@/lib/adminSession";

export default function AccountMenu() {
  const [user, setUser] = useState<AdminUser | null>(null);

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

  if (!user) return null;

  return (
    <div className="flex max-w-[16rem] shrink-0 items-center gap-2 py-1">
      <span className="relative flex h-9 w-9 shrink-0 overflow-hidden">
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
    </div>
  );
}
