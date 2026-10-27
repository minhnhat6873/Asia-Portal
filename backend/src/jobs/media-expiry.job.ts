import mongoose from "mongoose";
import { adminMediaRepository } from "../repositories/admin/media.repository";

let interval: NodeJS.Timeout | undefined;
let isRunning = false;

async function hideExpiredMedia(): Promise<void> {
  if (isRunning || mongoose.connection.readyState !== 1) return;
  isRunning = true;
  try {
    await adminMediaRepository.hideExpiredPosts();
  } catch {
    console.error("Không thể tự động ẩn bài viết hết hạn; hệ thống sẽ thử lại sau.");
  } finally {
    isRunning = false;
  }
}

export function startMediaExpiryJob(): void {
  if (interval) return;
  interval = setInterval(() => { void hideExpiredMedia(); }, 60_000);
  interval.unref();
  void hideExpiredMedia();
}
