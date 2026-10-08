export const PORTAL_CONTENT_EVENT = "asia-portal-content";

export function notifyPortalContentChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PORTAL_CONTENT_EVENT));
}

export function subscribePortalContent(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PORTAL_CONTENT_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(PORTAL_CONTENT_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

