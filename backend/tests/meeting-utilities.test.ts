import { MEETING_ROOMS, MEETING_TIME_OPTIONS } from "../src/config/meeting.config";
import {
  createOtpCode,
  hashOtp,
  isOtpMatch,
} from "../src/utils/otp/otp.util";
import { getVietnamNow, addMinutes, subtractMinutes, compareTimes } from "../src/utils/time/vietnamTime";
import { escapeHtml } from "../src/utils/html/escapeHtml";
import { maskEmail } from "../src/utils/email/maskEmail";

describe("meeting and OTP configuration", () => {
  it("defines only the two supported rooms and booking start times", () => {
    expect(MEETING_ROOMS).toEqual([
      { id: "room-01", name: "Phòng 1", floor: "Tầng 1", capacity: 12 },
      { id: "room-02", name: "Phòng 2", floor: "Tầng 1", capacity: 6 },
    ]);
    expect(MEETING_TIME_OPTIONS).toHaveLength(32);
    expect(MEETING_TIME_OPTIONS).not.toContain("17:00");
    expect(MEETING_TIME_OPTIONS).not.toContain("12:00");
  });
});

describe("OTP utilities", () => {
  const originalSecret = process.env.OTP_SECRET;

  beforeEach(() => {
    process.env.OTP_SECRET = "unit-test-secret";
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.OTP_SECRET;
    else process.env.OTP_SECRET = originalSecret;
  });

  it("creates a six-digit code", () => {
    expect(createOtpCode()).toMatch(/^\d{6}$/);
  });

  it("hashes the purpose, key and code and safely compares hashes", () => {
    const hash = hashOtp("meeting-create", "booking-key", "123456");
    expect(hash).toMatch(/^[\da-f]{64}$/);
    expect(isOtpMatch(hash, hash)).toBe(true);
    expect(isOtpMatch(hash, "short-hash")).toBe(false);
    expect(isOtpMatch(hash, "z".repeat(64))).toBe(false);
    expect(hashOtp("meeting-cancel", "booking-key", "123456")).not.toBe(hash);
  });

  it("throws the configured server error when the secret is missing", () => {
    delete process.env.OTP_SECRET;
    expect(() => hashOtp("meeting-create", "booking-key", "123456")).toThrow(
      "Máy chủ chưa cấu hình bảo mật OTP.",
    );
  });
});

describe("Vietnam time utilities", () => {
  it("formats a supplied instant in Vietnam regardless of host timezone", () => {
    expect(getVietnamNow(new Date("2026-10-09T17:15:00.000Z"))).toEqual({
      date: "2026-10-10",
      time: "00:15",
    });
  });

  it("adds, subtracts and compares clock times", () => {
    expect(addMinutes("11:45", 30)).toBe("12:15");
    expect(addMinutes("23:50", 20)).toBe("00:10");
    expect(subtractMinutes("13:00", 15)).toBe("12:45");
    expect(compareTimes("09:00", "09:15")).toBe(-1);
    expect(compareTimes("09:15", "09:15")).toBe(0);
    expect(compareTimes("09:30", "09:15")).toBe(1);
    expect(() => compareTimes("25:00", "09:00")).toThrow(RangeError);
  });
});

describe("meeting email utilities", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<script title="x">Tom & 'Sue'</script>`)).toBe(
      "&lt;script title=&quot;x&quot;&gt;Tom &amp; &#39;Sue&#39;&lt;/script&gt;",
    );
  });

  it("masks the local part while keeping the email domain", () => {
    expect(maskEmail("nguyen@asiafnb.com")).toBe("ng***@asiafnb.com");
    expect(maskEmail("a@asiafnb.com")).toBe("a***@asiafnb.com");
    expect(maskEmail("invalid-email")).toBe("***");
  });
});
