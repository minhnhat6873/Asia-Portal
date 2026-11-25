"use client";

import { Howl, Howler } from "howler";

/**
 * Sound and desktop pop-ups for new notifications (user portal and admin portal).
 *
 * - The sound needs no permission, but browsers only play it after the person has
 *   clicked or typed on the page once (autoplay rule). It also plays while the tab is
 *   in the background, as long as the page is open.
 * - Desktop pop-ups (Windows corner) need the person's permission and HTTPS (or
 *   localhost); on plain http the browser refuses them. They are shown only while the
 *   tab is hidden.
 */
const SOUND_SRC = "/sounds/notifications/alert-quick-chime.wav";
let sound: Howl | null = null;
let lastPlayed = 0;

function getSound(): Howl {
  sound ??= new Howl({ src: [SOUND_SRC], preload: true });
  return sound;
}

/** Call on a click or key press: lets the page play sound from then on. */
export function unlockNotificationSound(): void {
  getSound();
  if (Howler.ctx?.state === "suspended") void Howler.ctx.resume().catch(() => undefined);
}

export function playNotificationSound(): void {
  // Several notifications at once give one chime.
  if (Date.now() - lastPlayed < 2000) return;
  lastPlayed = Date.now();
  const chime = getSound();
  chime.stop();
  chime.play();
}

export type DesktopNotificationStatus = "unsupported" | "insecure" | NotificationPermission;

export function desktopNotificationStatus(): DesktopNotificationStatus {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return Notification.permission;
}

const PERMISSION_EVENT = "asia-notification-permission";

/** Asks once for desktop pop-ups (only from a button the person pressed). */
export async function requestDesktopNotifications(): Promise<DesktopNotificationStatus> {
  if (desktopNotificationStatus() === "default") {
    try { await Notification.requestPermission(); } catch { /* status below tells the result */ }
    window.dispatchEvent(new Event(PERMISSION_EVENT));
  }
  return desktopNotificationStatus();
}

/** For useSyncExternalStore: re-reads the status when the permission changes. */
export function subscribeDesktopNotificationStatus(onChange: () => void): () => void {
  window.addEventListener(PERMISSION_EVENT, onChange);
  window.addEventListener("focus", onChange);
  let status: PermissionStatus | null = null;
  void navigator.permissions?.query({ name: "notifications" }).then((value) => { status = value; status.addEventListener("change", onChange); }).catch(() => undefined);
  return () => {
    window.removeEventListener(PERMISSION_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    status?.removeEventListener("change", onChange);
  };
}

/**
 * Several open tabs see the same new notification; only the first to claim it alerts.
 * navigator.locks exists only on HTTPS, so plain http falls back to localStorage alone.
 */
export async function claimNotification(scope: string, id: string): Promise<boolean> {
  const key = `asia-notification-played:${scope}`;
  const claim = () => {
    try {
      const seen = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      if (seen.includes(id)) return false;
      localStorage.setItem(key, JSON.stringify([...seen, id].slice(-200)));
      return true;
    } catch {
      return true; // Site data blocked: alert in this tab anyway.
    }
  };
  return navigator.locks ? navigator.locks.request(`asia-notification:${scope}`, claim) : claim();
}

/** Windows/macOS pop-up; clicking it brings the tab back and opens the link. */
export function showDesktopNotification(item: { id: string; title: string; message: string }, onOpen: () => void): void {
  if (desktopNotificationStatus() !== "granted") return;
  try {
    const popup = new Notification(item.title, {
      body: item.message,
      tag: item.id,
      icon: "/favicon.ico",
      // Our chime already plays when sound is unlocked; otherwise let the system sound play.
      silent: Howler.ctx?.state === "running",
    });
    popup.onclick = () => { window.focus(); onOpen(); popup.close(); };
  } catch {
    /* Some browsers (e.g. Android Chrome) only allow pop-ups from a service worker. */
  }
}
