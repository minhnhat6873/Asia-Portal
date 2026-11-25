import { EventEmitter } from "node:events";
import type { Request, Response } from "express";

/**
 * Live "you have a new notification" signal to open pages (Server-Sent Events).
 * Browsers slow down timers in background tabs, but deliver these messages at once, so
 * the chime plays however long the tab has been hidden.
 *
 * In memory: works because the backend runs as one process (one container). With several
 * backend instances this would need a shared bus (e.g. MongoDB change streams or Redis).
 * The signal carries no data; the page then loads the list through the normal API, which
 * checks the session.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export const notificationEvents = {
  publish(accountIds: string[]): void {
    for (const accountId of new Set(accountIds)) emitter.emit(accountId);
  },
  subscribe(accountId: string, listener: () => void): () => void {
    emitter.on(accountId, listener);
    return () => { emitter.off(accountId, listener); };
  },
};

/** Which portal the stream belongs to; presence is tracked per portal. */
export type NotificationStreamScope = "user" | "admin";

/**
 * A stream that just closed still counts as online for this long: the server ends every
 * stream after 10 minutes and the browser reconnects a few seconds later.
 */
export const PRESENCE_GRACE_MS = 60_000;
const openStreams = new Map<string, number>();
const lastClosedAt = new Map<string, number>();
const presenceKey = (scope: NotificationStreamScope, accountId: string) => `${scope}:${accountId}`;

/**
 * Who has the site open right now (one live stream per browser, see notificationStream.ts).
 * It only knows the page is open, not that someone is looking at it.
 */
export const notificationPresence = {
  isOnline(accountId: string, scope: NotificationStreamScope, now = Date.now()): boolean {
    const key = presenceKey(scope, accountId);
    if ((openStreams.get(key) ?? 0) > 0) return true;
    const closedAt = lastClosedAt.get(key);
    return closedAt !== undefined && now - closedAt < PRESENCE_GRACE_MS;
  },
};

const HEARTBEAT_MS = 25_000;
/** The stream is closed now and then so the browser reconnects and the session is checked again. */
const MAX_STREAM_MS = 10 * 60_000;

export function openNotificationStream(request: Request, response: Response, accountId: string, scope: NotificationStreamScope = "user"): void {
  response.status(200);
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, no-transform");
  response.setHeader("Connection", "keep-alive");
  // Nginx must pass each message on at once instead of buffering the response.
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();
  response.write("retry: 5000\n\n");

  const key = presenceKey(scope, accountId);
  openStreams.set(key, (openStreams.get(key) ?? 0) + 1);
  lastClosedAt.delete(key);

  const unsubscribe = notificationEvents.subscribe(accountId, () => { response.write("event: notification\ndata: {}\n\n"); });
  // Comments keep proxies (Nginx read timeout 120 s) from closing an idle stream.
  const heartbeat = setInterval(() => { response.write(": ping\n\n"); }, HEARTBEAT_MS);
  const maxAge = setTimeout(() => { response.end(); }, MAX_STREAM_MS);
  request.on("close", () => {
    clearInterval(heartbeat);
    clearTimeout(maxAge);
    unsubscribe();
    const left = (openStreams.get(key) ?? 1) - 1;
    if (left > 0) openStreams.set(key, left);
    else { openStreams.delete(key); lastClosedAt.set(key, Date.now()); }
  });
}
