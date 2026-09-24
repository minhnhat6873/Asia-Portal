"use client";

/**
 * React bindings for the shared portal content store.
 *
 * Public pages call these instead of importing the static config directly, so
 * whatever the admin dashboard saves shows up on the portal — on first render
 * and again whenever the admin changes something (same tab or another tab).
 *
 * Implementation note: this deliberately does NOT use `useSyncExternalStore`.
 * These pages are statically prerendered, and the store lives in `localStorage`,
 * which only exists in the browser. A server snapshot and a client snapshot are
 * therefore guaranteed to disagree on first paint, and `useSyncExternalStore`
 * resolves that by keeping the server value until an explicit change event —
 * which is the stale list we do not want. Instead we render the fallback on the
 * first pass (so hydration matches) and swap in the real value in an effect,
 * which is the standard pattern for localStorage-backed UI.
 */

import { useEffect, useState } from "react";
import { departments as configDepartments, employees as configEmployees } from "@/config/employees";
import type { Employee as PublicEmployee } from "@/config/employees";
import { news as configNews } from "@/config/news";
import type { NewsItem } from "@/config/news";
import {
  readPublicDepartments,
  readPublicEmployees,
  readPublicNews,
  subscribePortalContent,
} from "@/lib/portalContent";

/* Stable fallback references so React state identity does not churn. */
const EMPLOYEE_FALLBACK: PublicEmployee[] = configEmployees ?? [];
const NEWS_FALLBACK: NewsItem[] = configNews ?? [];
const DEPARTMENT_FALLBACK: string[] = configDepartments ?? [];

/**
 * Generic live reader: starts from `fallback` (matching the prerendered HTML),
 * then reads the browser store after mount and again on every content change.
 *
 * The state is only replaced when the serialised value actually differs. The
 * readers build a fresh array on every call (they map over localStorage), so a
 * naive `setValue(read())` re-renders forever: new array identity each time,
 * which is the "Maximum update depth exceeded" loop.
 */
function useLiveContent<T>(read: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const sync = () => {
      const next = read();
      setValue((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next
      );
    };

    // Read once on mount — this is where the server-rendered config data is
    // replaced by whatever the admin dashboard has actually saved.
    sync();
    return subscribePortalContent(sync);
  }, [read]);

  return value;
}

/* Module-level readers: stable identity, and each closes over its own fallback
 * so `useLiveContent` is never handed a fresh function per render. */
const readEmployees = () => readPublicEmployees(EMPLOYEE_FALLBACK);
const readNews = () => readPublicNews(NEWS_FALLBACK);

/** Live employee list: static config until an admin writes, then admin data. */
export function useEmployees(): PublicEmployee[] {
  return useLiveContent<PublicEmployee[]>(readEmployees, EMPLOYEE_FALLBACK);
}

/** Live department filter list, including any department an admin added. */
export function useDepartments(): string[] {
  const employees = useEmployees();
  return readPublicDepartments(employees, DEPARTMENT_FALLBACK);
}

/** Live news list, published admin posts first once the admin has posted. */
export function useNews(): NewsItem[] {
  return useLiveContent<NewsItem[]>(readNews, NEWS_FALLBACK);
}