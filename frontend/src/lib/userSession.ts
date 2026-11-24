"use client";

import { useSyncExternalStore } from "react";
import { ApiError } from "@/services/api";
import { getUserSession, type UserAccount } from "@/services/user-auth.service";

/**
 * One shared view of the user-portal session for the whole page (menu, navbar, page
 * gates). Hiding things here is only for the interface: the API refuses guests itself.
 */
export type UserSessionState =
  | { status: "loading"; account: null }
  | { status: "guest"; account: null }
  | { status: "user"; account: UserAccount };

let state: UserSessionState = { status: "loading", account: null };
const listeners = new Set<() => void>();
let checking: Promise<void> | null = null;
let started = false;

function publish(next: UserSessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Checks the session with the server. Network or server errors keep the known state. */
export function refreshUserSession(): Promise<void> {
  if (checking) return checking;
  checking = (async () => {
    try {
      publish({ status: "user", account: await getUserSession() });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) publish({ status: "guest", account: null });
      // A first check that fails for another reason must not leave pages loading forever.
      else if (state.status === "loading") publish({ status: "guest", account: null });
    } finally {
      checking = null;
    }
  })();
  return checking;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void refreshUserSession();
  const onVisible = () => { if (document.visibilityState === "visible") void refreshUserSession(); };
  window.addEventListener("focus", onVisible);
  window.addEventListener("asia-user-session-changed", () => void refreshUserSession());
  window.setInterval(onVisible, 60_000);
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const serverState: UserSessionState = { status: "loading", account: null };

export function useUserSession(): UserSessionState {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

/** Marks the session as signed out right away (before the server round trip). */
export function markSignedOut() {
  publish({ status: "guest", account: null });
}
