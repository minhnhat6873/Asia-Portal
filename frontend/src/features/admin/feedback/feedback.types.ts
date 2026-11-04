export type FeedbackStatus = "pending" | "seen";

export interface FeedbackItem {
  id: string;
  title: string;
  content: string;
  /** null = người gửi ẩn danh */
  sender: { name: string; email: string } | null;
  createdAt: string; // ISO
  status: FeedbackStatus;
  pinned: boolean;
}

/** Dữ liệu người dùng nhập ở form "Đóng góp ý kiến" ngoài trang công khai. */
export type FeedbackSubmission = Pick<FeedbackItem, "title" | "content" | "sender">;

export const FEEDBACK_LIMITS = { title: 150, content: 2000, name: 100, email: 150 } as const;

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: "Chưa xử lý",
  seen: "Đã xem",
};
