"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { RecoveryProvider } from "@/features/auth/RecoveryContext";
import ProductCarousel from "./ProductCarousel";
import { useRegistrationEnabled } from "./useRegistrationEnabled";
import "./auth.css";
const subscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const hydrated = useSyncExternalStore(subscribe, isClient, isServer);
  const screen = hydrated ? path.slice(1) : "";
  const registrationEnabled = useRegistrationEnabled();
  // The login screen links to registration only while self-registration is open.
  const showTopLink = hydrated && (screen !== "login" || registrationEnabled === true);
  return (
    <RecoveryProvider>
      <div className="public-auth">
        <main>
          <div className="shell">
            <ProductCarousel />
            <article className="card" data-screen={screen}>
              <div className="auth-card-scroll">
              <header className="topline min-h-11">
                {showTopLink && (
                  <Link
                    className="top-link"
                    href={screen === "login" ? "/register" : "/login"}
                  >
                    {screen === "login" ? "Đăng ký tài khoản" : "Đăng nhập"}
                    <ArrowRight className="icon" aria-hidden="true" />
                  </Link>
                )}
              </header>
              <div className="auth-brand">
                <Link href="/" aria-label="ASIA F&B — Về trang chủ" className="inline-flex rounded-full">
                  <img src="/assets/auth/asia-logo.png" alt="ASIA F&B" />
                </Link>
                <span className="welcome">
                  <span aria-hidden="true">✧</span> Welcome Asia
                </span>
              </div>
              {children}
              </div>
            </article>
          </div>
        </main>
      </div>
    </RecoveryProvider>
  );
}
