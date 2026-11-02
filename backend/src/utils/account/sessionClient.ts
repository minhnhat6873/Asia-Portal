import { isIP } from "node:net";
import type { SessionClientInfo } from "../../interfaces/auth-session.interface";

export function normalizeSessionIp(ip?: string): string | undefined {
  const normalized = ip?.replace(/^::ffff:/, "");
  return normalized && isIP(normalized) ? normalized : undefined;
}

// These are descriptive hints, not trusted device IDs or authorization data.
export function describeSessionClient(info: SessionClientInfo) {
  const ua = info.userAgent?.slice(0, 512) ?? "";
  const browser = /Edg(?:A|iOS)?\//.test(ua) ? "Microsoft Edge"
    : /OPR\//.test(ua) ? "Opera"
      : /(?:Firefox|FxiOS)\//.test(ua) ? "Firefox"
        : /(?:Chrome|CriOS)\//.test(ua) ? "Chrome"
          : /Safari\//.test(ua) ? "Safari" : "Chưa xác định";
  const operatingSystem = /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS / iPadOS"
      : /Windows/.test(ua) ? "Windows"
        : /Macintosh|Mac OS X/.test(ua) ? "macOS"
          : /Linux/.test(ua) ? "Linux" : "Chưa xác định";
  const ipAddress = normalizeSessionIp(info.ipAddress);
  return { browser, operatingSystem, ipAddress, lastIpAddress: ipAddress };
}
