/**
 * Only paths on this site may be used as a destination (after sign-in, or from a
 * notification). Anything else ("//evil.com", "/\evil.com", "https://...") falls back.
 */
export function safeSitePath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/** Sign-in link that brings the person back to this page afterwards. */
export function loginHref(path: string): string {
  const safe = safeSitePath(path);
  return safe === "/" || safe.startsWith("/login") ? "/login" : `/login?next=${encodeURIComponent(safe)}`;
}

/** Where to go after a successful sign-in (never back to the sign-in page itself). */
export function afterLoginPath(next: string | null | undefined): string {
  const safe = safeSitePath(next);
  return safe.startsWith("/login") ? "/" : safe;
}
