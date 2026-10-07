"use client";

/**
 * React bindings for the shared portal content store.
 *
 * React binding retained for media posts while that module still uses the
 * shared localStorage store. Employee pages use the backend API directly.
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
import { news as configNews } from "@/config/news";
import type { NewsItem } from "@/config/news";
import {
  readPublicNews,
  subscribePortalContent,
} from "@/lib/portalContent";

/* Stable fallback references so React state identity does not churn. */
const NEWS_FALLBACK: NewsItem[] = configNews ?? [];

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
const readNews = () => readPublicNews(NEWS_FALLBACK);

/** Live news list, published admin posts first once the admin has posted. */
export function useNews(): NewsItem[] {
  return useLiveContent<NewsItem[]>(readNews, NEWS_FALLBACK);
}
