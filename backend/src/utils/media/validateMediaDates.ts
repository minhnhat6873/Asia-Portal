import { AppError } from "../errors/AppError";
import { getVietnamNow } from "../time/vietnamTime";

export const MEDIA_EXPIRY_DATE_ERROR = "Ngày hết hạn phải sau ngày đăng ít nhất 1 ngày.";

export function isMediaExpiryAfterPublication(publishDate: Date, expiryDate?: Date | null): boolean {
  return !expiryDate || expiryDate.toISOString().slice(0, 10) > publishDate.toISOString().slice(0, 10);
}

export function validateMediaDates(publishDate: Date, expiryDate?: Date | null): void {
  if (!isMediaExpiryAfterPublication(publishDate, expiryDate)) {
    throw new AppError(400, MEDIA_EXPIRY_DATE_ERROR);
  }
}

export function getMediaExpiryCutoff(now = new Date()): Date {
  return new Date(`${getVietnamNow(now).date}T00:00:00.000Z`);
}

export function withMediaExpiry<T extends { expiryDate?: Date | null }>(post: T): T & { isExpired: boolean } {
  return { ...post, isExpired: Boolean(post.expiryDate && post.expiryDate < getMediaExpiryCutoff()) };
}
