/**
 * Vietnamese phone numbers. Same rules as frontend/src/lib/vehicleValidation.ts.
 *
 * - Mobile: 10 digits, 0 + a carrier prefix in use:
 *   Viettel 032–039, 086, 096–098 · Vinaphone 081–085, 088, 091, 094 ·
 *   Mobifone 070, 076–079, 089, 090, 093 · Vietnamobile 052, 056, 058, 092 ·
 *   Gmobile 059, 099 · Itelecom 087 · Reddi 055.
 * - Landline: 11 digits starting with 02 (area codes since 2017, e.g. 028 3812 3456).
 * - "+84" / "84" is accepted instead of the leading 0; spaces, dots, dashes and
 *   brackets may separate the digits. The stored form is the plain local number.
 */
export const VIETNAM_MOBILE_PREFIXES: ReadonlySet<string> = new Set([
  "032", "033", "034", "035", "036", "037", "038", "039",
  "052", "055", "056", "058", "059",
  "070", "076", "077", "078", "079",
  "081", "082", "083", "084", "085", "086", "087", "088", "089",
  "090", "091", "092", "093", "094", "096", "097", "098", "099",
]);

/** One message for every wrong number (wrong length, prefix, letters, foreign number…). */
export const VIETNAM_PHONE_INVALID = "Số điện thoại không hợp lệ.";

/** The plain local number ("0901234567"), or null when it is not a Vietnamese phone number. */
export function normalizeVietnamPhone(value: string): string | null {
  const text = value.trim();
  if (!/^\+?[\d\s.()-]+$/.test(text) || !/\d/.test(text)) return null;
  const compact = text.replace(/[\s.()-]/g, "");
  const hasPlus = compact.startsWith("+");
  let digits = hasPlus ? compact.slice(1) : compact;
  if (hasPlus && !digits.startsWith("84")) return null;
  // Country code: "+84 901…", "84901…", also the common "+84 0901…".
  if (digits.startsWith("84")) digits = `0${digits.slice(2).replace(/^0/, "")}`;
  if (!digits.startsWith("0")) return null;
  if (digits.startsWith("02")) return digits.length === 11 ? digits : null;
  return digits.length === 10 && VIETNAM_MOBILE_PREFIXES.has(digits.slice(0, 3)) ? digits : null;
}
