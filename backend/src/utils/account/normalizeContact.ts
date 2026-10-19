export function normalizeAccountPhone(value: string): string {
  return value.trim().replace(/[\s.-]/g, "").replace(/^\+84/, "0");
}

/** Match legacy phone formatting as well as the normalized value. */
export function accountPhonePattern(phone: string): RegExp {
  const normalized = normalizeAccountPhone(phone);
  const digits = normalized.replace(/^0/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*(?:0|\\+[\\s.-]*8[\\s.-]*4)[\\s.-]*${digits.split("").join("[\\s.-]*")}[\\s.-]*$`);
}
