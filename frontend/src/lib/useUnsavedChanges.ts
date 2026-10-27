"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { registerUnsavedChangesGuard } from "./unsavedChangesNavigation";

const HISTORY_MARKER = "asiaEmployeeUnsavedChanges";

export function useUnsavedChanges(hasChanges: boolean, isSaving: boolean) {
  const router = useRouter();
  const id = useId();
  const latest = useRef({ hasChanges, isSaving });
  const bypass = useRef(false);
  const sentinel = useRef(false);
  const restoring = useRef(false);
  const rewinding = useRef<Promise<void> | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const [isPromptOpen, setPromptOpen] = useState(false);

  useLayoutEffect(() => { latest.current = { hasChanges, isSaving }; }, [hasChanges, isSaving]);

  // Remove the temporary history entry before following the chosen destination.
  const removeSentinel = useCallback((): Promise<void> => {
    if (rewinding.current) return rewinding.current;
    if (!sentinel.current) return Promise.resolve();
    if (history.state?.[HISTORY_MARKER] !== id) { sentinel.current = false; return Promise.resolve(); }
    sentinel.current = false;
    rewinding.current = new Promise<void>((resolve) => {
      const finish = () => { rewinding.current = null; resolve(); };
      window.addEventListener("popstate", finish, { once: true });
      history.back();
    });
    return rewinding.current;
  }, [id]);

  const askToLeave = useCallback((action: () => void) => {
    if (bypass.current) { action(); return; }
    if (latest.current.isSaving) return;
    if (!latest.current.hasChanges) { void removeSentinel().then(action); return; }
    if (!pending.current) {
      pending.current = action;
      setPromptOpen(true);
    }
  }, [removeSentinel]);

  useEffect(() => {
    const unregister = registerUnsavedChangesGuard(askToLeave);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!bypass.current && (latest.current.hasChanges || latest.current.isSaving)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const onLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.download || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, location.href);
      if (!/^https?:$/.test(url.protocol) || (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search)) return;
      if (!latest.current.hasChanges && !latest.current.isSaving) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      askToLeave(() => {
        if (url.origin === location.origin) router.push(url.pathname + url.search + url.hash);
        else location.assign(url.href);
      });
    };
    const onPopState = (event: PopStateEvent) => {
      if (bypass.current || rewinding.current) return;
      if (restoring.current) {
        event.stopImmediatePropagation();
        restoring.current = false;
        askToLeave(() => history.back());
        return;
      }
      if (!sentinel.current || !latest.current.hasChanges) return;
      event.stopImmediatePropagation();
      restoring.current = true;
      history.forward();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onLink, true);
    window.addEventListener("popstate", onPopState, true);
    return () => {
      unregister();
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onLink, true);
      window.removeEventListener("popstate", onPopState, true);
    };
  }, [askToLeave, router]);

  useEffect(() => {
    if (hasChanges && !bypass.current && !sentinel.current) {
      const addSentinel = () => {
        if (!latest.current.hasChanges || bypass.current || sentinel.current) return;
        history.pushState({ ...history.state, [HISTORY_MARKER]: id }, "", location.href);
        sentinel.current = true;
      };
      if (rewinding.current) void rewinding.current.then(addSentinel);
      else addSentinel();
    } else if (!hasChanges) {
      void removeSentinel();
    }
  }, [hasChanges, id, removeSentinel]);

  const cancelNavigation = () => { pending.current = null; setPromptOpen(false); };
  const leave = async (fallback?: () => void) => {
    const action = pending.current ?? fallback;
    if (!action) return;
    bypass.current = true;
    pending.current = null;
    setPromptOpen(false);
    await removeSentinel();
    action();
  };
  return { isPromptOpen, cancelNavigation, leave };
}
