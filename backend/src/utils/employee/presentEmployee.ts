export function presentEmployee<T extends object>(employee: T, permissions: readonly string[] = []): T {
  const document = employee as T & { toObject?: () => T };
  const result = document.toObject ? document.toObject() : { ...employee };
  if (!permissions.includes("employees:view-birth-date")) delete (result as { birthDate?: unknown }).birthDate;
  return result;
}
