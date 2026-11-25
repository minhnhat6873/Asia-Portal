/**
 * Pages that need a signed-in account live under /user (admin pages under /admin);
 * any other path is public.
 */
export const USER_HOME = "/user";

/** True for "/user" and anything below it ("/user/news/1", "/user?x", "/user#resources"). */
export function isUserPath(path: string): boolean {
  return /^\/user(?:[/?#]|$)/.test(path);
}

/**
 * Only paths on this site may be used as a destination (after sign-in, or from a
 * notification). Anything else ("//evil.com", "/\evil.com", "https://...") falls back.
 */
export function safeSitePath(value: string | null | undefined, fallback = USER_HOME): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/** Sign-in link that brings the person back to this page afterwards. */
export function loginHref(path: string): string {
  const safe = safeSitePath(path);
  return isUserPath(safe) && safe !== USER_HOME ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

/** Where to go after a successful sign-in: back to a /user page, otherwise the home page. */
export function afterLoginPath(next: string | null | undefined): string {
  const safe = safeSitePath(next);
  return isUserPath(safe) ? safe : USER_HOME;
}
