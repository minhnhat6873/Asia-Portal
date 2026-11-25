"use client";

/**
 * One live notification stream per browser, shared by all open tabs of the portal.
 *
 * Over plain http a browser allows only 6 connections to one site; a stream per tab would
 * use them up (7th tab hangs) and multiplies the server's open connections. So one tab,
 * the "leader", holds the stream and passes each signal to the other tabs through a
 * BroadcastChannel. When the leader tab closes, another tab takes over.
 *
 * - HTTPS: Web Locks choose the leader; the browser hands the lock to a waiting tab the
 *   moment the leader closes or crashes.
 * - Plain http (no Web Locks): the leader writes a heartbeat to localStorage. A normal
 *   close clears it at once; a crashed leader is replaced once its heartbeat is older
 *   than STALE_MS (long enough for hidden tabs, whose timers run about once a minute).
 */
const HEARTBEAT_MS = 5_000;
const STALE_MS = 90_000;
const REOPEN_MS = 10_000;

export interface NotificationStreamHandlers {
  /** A new notification exists (from this tab's stream or the leader's). */
  onSignal: () => void;
  /** The server refused the stream (e.g. session expired): load through the normal API, which renews it. */
  onStreamDown: () => void;
}

type Heartbeat = { id: string; at: number };

export function subscribeNotificationStream(scope: string, url: string, handlers: NotificationStreamHandlers): () => void {
  let stopped = false;
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`asia-notify:${scope}`) : null;
  channel?.addEventListener("message", (event: MessageEvent) => { if (event.data === "notification") handlers.onSignal(); });

  // ---- the stream (only the leader opens it) ----
  let source: EventSource | null = null;
  let reopen: ReturnType<typeof setTimeout> | undefined;
  const openStream = () => {
    if (stopped || source || typeof EventSource === "undefined") return;
    source = new EventSource(url);
    source.addEventListener("notification", () => {
      channel?.postMessage("notification");
      handlers.onSignal();
    });
    source.onerror = () => {
      // A dropped connection reconnects by itself; only a refused one is CLOSED.
      if (source?.readyState !== EventSource.CLOSED) return;
      source = null;
      handlers.onStreamDown();
      reopen = setTimeout(openStream, REOPEN_MS);
    };
  };
  const closeStream = () => {
    clearTimeout(reopen);
    source?.close();
    source = null;
  };

  // ---- leader election with Web Locks (HTTPS) ----
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks) {
    const waiting = new AbortController();
    let release: (() => void) | null = null;
    locks.request(`asia-notify-leader:${scope}`, { signal: waiting.signal }, () => new Promise<void>((resolve) => {
      if (stopped) { resolve(); return; }
      release = resolve;
      openStream();
    })).catch(() => undefined); // AbortError when this tab stops while still waiting.
    return () => {
      stopped = true;
      waiting.abort();
      closeStream();
      release?.();
      channel?.close();
    };
  }

  // ---- fallback: localStorage heartbeat (plain http) ----
  const key = `asia-notify-leader:${scope}`;
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  let leader = false;
  /** undefined = storage blocked (then every tab keeps its own stream). */
  const read = (): Heartbeat | null | undefined => {
    try { return JSON.parse(localStorage.getItem(key) || "null") as Heartbeat | null; } catch { return undefined; }
  };
  const write = () => { try { localStorage.setItem(key, JSON.stringify({ id, at: Date.now() })); } catch { /* blocked */ } };
  const lead = () => { leader = true; openStream(); };
  const step = () => {
    if (stopped) return;
    const current = read();
    if (current === undefined) { if (!leader) lead(); return; }
    if (leader) {
      // Another tab took over (e.g. this tab was paused too long): give the stream up.
      if (current && current.id !== id) { leader = false; closeStream(); return; }
      write();
      return;
    }
    if (!current || Date.now() - current.at > STALE_MS) {
      write();
      // Several tabs may claim at once; the last writer wins, the others stay followers.
      setTimeout(() => { if (!stopped && !leader && read()?.id === id) { lead(); write(); } }, 150 + Math.random() * 250);
    }
  };
  const onStorage = (event: StorageEvent) => { if (event.key === key && !event.newValue) step(); };
  const resign = () => {
    if (!leader) return;
    try { if (read()?.id === id) localStorage.removeItem(key); } catch { /* blocked */ }
  };
  step();
  const timer = setInterval(step, HEARTBEAT_MS);
  window.addEventListener("storage", onStorage);
  window.addEventListener("pagehide", resign);
  return () => {
    stopped = true;
    clearInterval(timer);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pagehide", resign);
    resign();
    leader = false;
    closeStream();
    channel?.close();
  };
}
