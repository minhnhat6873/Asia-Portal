export const NOTIFICATION_TYPES = [
  "news", "meeting-booked", "meeting-reminder",
  // Vehicle requests: to the requester
  "vehicle-arranged", "vehicle-updated", "vehicle-completed", "vehicle-cancelled", "vehicle-reminder",
  // Vehicle requests: to HR (accounts with "vehicles:manage")
  "vehicle-new", "vehicle-arrived", "vehicle-overdue",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface UserNotification {
  accountId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Site-relative link the notification opens, e.g. "/user/news/<id>". */
  link: string;
  /** The post or booking it is about; one notification per account, type and ref. */
  refId: string;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NotificationInput = Pick<UserNotification, "type" | "title" | "message" | "link" | "refId">;
