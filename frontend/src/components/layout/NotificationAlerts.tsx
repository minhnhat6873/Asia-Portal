"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { safeSitePath } from "@/lib/safeRedirect";
import { claimNotification, playNotificationSound, showDesktopNotification, unlockNotificationSound } from "@/lib/notificationAlerts";
import { subscribeNotificationStream } from "@/lib/notificationStream";
import type { NotificationPage } from "@/services/notification.service";

/** Backup check, in case the live stream is down. */
const POLL_MS = 60_000;

/**
 * Watches the notification list and alerts on new ones: a chime (also while the tab is
 * in the background) and, while the tab is hidden, a desktop pop-up if the person
 * allowed it. Notifications already there when the page opens are not "new".
 *
 * The server pushes a signal through a live stream (Server-Sent Events) the moment a
 * notification is created. Browsers slow down timers in hidden tabs but deliver these
 * at once, so the chime does not wait however long the tab has been in the background.
 */
export default function NotificationAlerts({ scope, streamUrl, load, fallbackLink, onFresh }: {
  /** e.g. "user:<accountId>"; null while signed out (nothing is watched). */
  scope: string | null;
  /** Live stream, e.g. "/backend-api/user/notifications/stream". */
  streamUrl: string;
  load: () => Promise<NotificationPage>;
  /** Where a pop-up goes when the notification has no usable link. */
  fallbackLink: string;
  /** Called when new notifications arrive (e.g. to refresh the bell count). */
  onFresh?: () => void;
}) {
  const router = useRouter();
  const loadRef = useRef(load);
  const onFreshRef = useRef(onFresh);
  useEffect(() => { loadRef.current = load; onFreshRef.current = onFresh; });

  useEffect(() => {
    if (!scope) return;
    let active = true;
    let polling = false;
    let known: Set<string> | null = null;

    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const page = await loadRef.current();
        if (!active) return;
        const previous = known;
        known = new Set(page.items.map((item) => item.id));
        if (!previous) return;
        const fresh = page.items.filter((item) => !item.read && !previous.has(item.id));
        if (!fresh.length) return;
        onFreshRef.current?.();
        const mine = [];
        for (const item of fresh) if (await claimNotification(scope, item.id)) mine.push(item);
        if (!active || !mine.length) return;
        playNotificationSound();
        if (document.hidden) {
          for (const item of mine.slice(0, 3)) showDesktopNotification(item, () => router.push(safeSitePath(item.link, fallbackLink)));
        }
      } catch {
        /* Network or session problem: try again on the next round. */
      } finally {
        polling = false;
      }
    };

    // Live stream, one per browser (shared by the tabs): the server says "new
    // notification", the list is loaded and compared. If the server refuses the stream
    // (e.g. session expired), loading through the normal API renews the session.
    void poll();
    const stopStream = subscribeNotificationStream(scope, streamUrl, { onSignal: () => { void poll(); }, onStreamDown: () => { void poll(); } });
    const timer = window.setInterval(poll, POLL_MS);
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pointerdown", unlockNotificationSound);
    window.addEventListener("keydown", unlockNotificationSound);
    return () => {
      active = false;
      stopStream();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", unlockNotificationSound);
      window.removeEventListener("keydown", unlockNotificationSound);
    };
  }, [scope, streamUrl, fallbackLink, router]);

  return null;
}
