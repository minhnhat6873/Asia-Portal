"use client";

import { usePathname } from "next/navigation";
import AuthLayout from "@/features/public-auth/AuthLayout";

const authPaths = new Set(["/login", "/register", "/forgot-password", "/otp", "/reset-password"]);

export default function PageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return authPaths.has(pathname) ? <AuthLayout>{children}</AuthLayout> : children;
}
