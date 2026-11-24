"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getUnreadNotificationCount } from "@/services/notification.service";
import { useUserSession } from "./userSession";

/** Unread notification count shared by the bell and the account menu. */
let unread = 0;
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function publish(value: number) {
  unread = value;
  listeners.forEach((listener) => listener());
}

export function setUnreadNotificationCount(value: number) {
  publish(Math.max(0, value));
}

export function refreshUnreadNotificationCount(): Promise<void> {
  if (loading) return loading;
  loading = getUnreadNotificationCount()
    .then(publish, () => undefined)
    .finally(() => { loading = null; });
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useUnreadNotificationCount(): number {
  const signedIn = useUserSession().status === "user";
  const count = useSyncExternalStore(subscribe, () => unread, () => 0);

  useEffect(() => {
    if (!signedIn) { publish(0); return; }
    void refreshUnreadNotificationCount();
    const refresh = () => { if (document.visibilityState === "visible") void refreshUnreadNotificationCount(); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("asia-notifications-changed", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("asia-notifications-changed", refresh);
    };
  }, [signedIn]);

  return signedIn ? count : 0;
}
