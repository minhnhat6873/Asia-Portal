"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import ProductCarousel from "./ProductCarousel";
import "./auth.css";
const subscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;
export default function AuthLayout({children}:{children:React.ReactNode}) {
 const path=usePathname(); const hydrated=useSyncExternalStore(subscribe, isClient, isServer); const screen=hydrated ? path.slice(1) : "";
 return <div className="public-auth"><main><div className="shell"><ProductCarousel/><article className="card" data-screen={screen}><header className="topline min-h-11">{hydrated && <Link className="top-link" href={screen === "login" ? "/register" : "/login"}>{screen === "login" ? "Đăng ký" : "Đăng nhập"} ↗</Link>}</header><div className="auth-brand"><img src="/assets/auth/asia-logo.png" alt="ASIA F&B"/><span className="welcome"><span aria-hidden="true">✧</span> Welcome Asia</span></div>{children}</article></div></main></div>;
}
