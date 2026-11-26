"use client";

import { useEffect, useRef } from "react";
import type { NotificationType } from "@/services/notification.service";

/**
 * New notifications just arrived in this tab (NotificationAlerts saw them through the live
 * stream). Pages that show the same data listen and reload, so a new trip or a trip HR just
 * arranged appears without reloading the page.
 */
const FRESH_EVENT = "asia-notifications-fresh";

export function announceFreshNotifications(types: NotificationType[]): void {
  window.dispatchEvent(new CustomEvent<NotificationType[]>(FRESH_EVENT, { detail: types }));
}

/** Coming back to the page fires both "focus" and "visibilitychange": reload once. */
const RETURN_GAP_MS = 1_500;

/**
 * Calls reload when:
 * - a fresh notification of a type starting with `prefix` arrives (e.g. "vehicle-"),
 *   or such a notification is clicked while its page is already open;
 * - the person comes back to the page: another tab, or another browser window (two
 *   windows side by side do not fire "visibilitychange", only "focus"). This also covers
 *   changes that sent this person no notification, e.g. another HR person arranged a trip.
 */
export function useLiveRefresh(prefix: string, reload: () => void): void {
  const reloadRef = useRef(reload);
  useEffect(() => { reloadRef.current = reload; });
  useEffect(() => {
    let lastReturn = 0;
    const onFresh = (event: Event) => {
      const types = (event as CustomEvent<NotificationType[]>).detail ?? [];
      if (types.some((type) => type.startsWith(prefix))) reloadRef.current();
    };
    const onReturn = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastReturn < RETURN_GAP_MS) return;
      lastReturn = Date.now();
      reloadRef.current();
    };
    window.addEventListener(FRESH_EVENT, onFresh);
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener(FRESH_EVENT, onFresh);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [prefix]);
}
