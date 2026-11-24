"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LockKeyhole, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useUserSession } from "@/lib/userSession";
import { loginHref } from "@/lib/safeRedirect";
import styles from "./LoginRequired.module.css";

export { loginHref };

/**
 * Internal pages: guests see a sign-in prompt instead of the content. The API refuses
 * guests on its own, so this only decides what the page shows.
 */
export default function LoginRequired({ children }: { children: ReactNode; what?: string }) {
  const session = useUserSession();
  const pathname = usePathname();
  if (session.status === "user") return children;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <section className="flex flex-1 items-center justify-center px-4 py-16">
        {session.status === "loading" ? (
          <div role="status" className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            Đang kiểm tra đăng nhập…
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.photo} aria-hidden="true"><div className={styles.photoImage} /></div>
            <div className={styles.content}>
              <LockKeyhole aria-hidden="true" className={styles.lock} size={40} strokeWidth={1.8} />
              <h1>Vui lòng đăng nhập</h1>
              <p>Bạn cần đăng nhập để truy cập và sử dụng các tính năng của Asia Portal.</p>
              <Link href={loginHref(pathname)} className={styles.login}>
                <UserRound aria-hidden="true" size={24} strokeWidth={1.8} />
                Đăng nhập
              </Link>
              <Link href="/" className={styles.back}>
                <ArrowLeft aria-hidden="true" size={21} />
                Quay về trang chủ
              </Link>
            </div>
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
