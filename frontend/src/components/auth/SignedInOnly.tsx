"use client";

import type { ReactNode } from "react";
import { useUserSession } from "@/lib/userSession";

/** Renders its children only for signed-in accounts (internal sections on public pages). */
export default function SignedInOnly({ children }: { children: ReactNode }) {
  return useUserSession().status === "user" ? children : null;
}
