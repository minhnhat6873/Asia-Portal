"use client";
import { useEffect, useState } from "react";
import { getPublicSiteSettings } from "@/services/site-settings.service";

// null while loading. Any failure counts as closed: the backend rejects registration anyway
// when it is switched off, so hiding the link is only a convenience.
export function useRegistrationEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getPublicSiteSettings(controller.signal)
      .then((settings) => setEnabled(settings.userRegistrationEnabled === true))
      .catch(() => { if (!controller.signal.aborted) setEnabled(false); });
    return () => controller.abort();
  }, []);
  return enabled;
}
