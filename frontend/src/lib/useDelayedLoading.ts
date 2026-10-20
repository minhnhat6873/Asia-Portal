"use client";

import { useEffect, useState } from "react";

/** Delay the indicator, never the request or its result. */
export function useDelayedLoading(isLoading: boolean, delayMs = 1000, resetKey?: string) {
  const [state, setState] = useState({ isLoading, resetKey, visible: false });

  // Reset during render so a new loading cycle cannot flash the previous indicator.
  if (state.isLoading !== isLoading || state.resetKey !== resetKey) {
    setState({ isLoading, resetKey, visible: false });
  }

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setTimeout(() => {
      setState({ isLoading, resetKey, visible: true });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [isLoading, delayMs, resetKey]);

  return isLoading && state.isLoading === isLoading && state.resetKey === resetKey && state.visible;
}
