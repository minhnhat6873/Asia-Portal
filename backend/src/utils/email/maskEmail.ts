export function maskEmail(email: string): string {
  const separatorIndex = email.lastIndexOf("@");
  if (separatorIndex <= 0 || separatorIndex === email.length - 1) return "***";

  const localPart = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);
  return `${localPart.slice(0, 2)}***@${domain}`;
}
