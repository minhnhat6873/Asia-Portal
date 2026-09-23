function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS ?? process.env.DOMAIN_FRONTEND;
const fallbackOrigins = process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"];

export const allowedCorsOrigins = (configuredOrigins
  ? configuredOrigins.split(",")
  : fallbackOrigins
)
  .map(normalizeOrigin)
  .filter((origin) => origin.length > 0 && origin !== "*");

export const securityConfig = {
  rateLimitWindowMs: parsePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: parsePositiveInteger(process.env.RATE_LIMIT_MAX, 100),
  authRateLimitMax: parsePositiveInteger(process.env.AUTH_RATE_LIMIT_MAX, 5),
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS) || 0,
};

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  // Postman, curl and server-to-server requests do not send Origin.
  if (!origin) return true;
  return allowedCorsOrigins.includes(normalizeOrigin(origin));
}
