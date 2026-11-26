import type { ReactNode } from "react";
import UserRouteGuard from "@/components/auth/UserRouteGuard";

/** /user = pages for signed-in staff. Anything outside /user and /admin is public. */
export default function UserLayout({ children }: { children: ReactNode }) {
  return <UserRouteGuard>{children}</UserRouteGuard>;
}
