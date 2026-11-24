import { MEETING_REMINDER_LEAD_MINUTES, MEETING_ROOMS } from "../../config/meeting.config";
import type { Media } from "../../interfaces/media.interface";
import type { MeetingBooking } from "../../interfaces/meeting.interface";
import { notificationRepository } from "../../repositories/user/notification.repository";

const PAGE_SIZE = 20;
const toDisplayDate = (date: string) => date.split("-").reverse().join("/");
const roomName = (roomId: string) => MEETING_ROOMS.find(({ id }) => id === roomId)?.name ?? "Phòng họp";
const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

type BookingRef = Pick<MeetingBooking, "title" | "roomId" | "date" | "start" | "end" | "email"> & { _id: unknown };

/** Notifications never block the action that caused them; failures are only logged. */
async function safely(label: string, work: () => Promise<void>): Promise<void> {
  try { await work(); } catch (error) { console.error(`Không thể tạo thông báo (${label}).`, error); }
}

export const notificationService = {
  /**
   * Tells every active account about a newly published post, once per post. Signed-in
   * users can read public and internal posts, so everyone is notified.
   */
  announceMedia(post: Pick<Media, "title" | "status"> & { _id: unknown }): Promise<void> {
    return safely("tin tức mới", async () => {
      if (post.status !== "published") return;
      // Claim the post so a later edit or re-publish does not notify again.
      if (!(await notificationRepository.claimMediaAnnouncement(String(post._id)))) return;
      const refId = String(post._id);
      await notificationRepository.insertForAccounts(await notificationRepository.activeAccountIds(), {
        type: "news", refId, link: `/news/${refId}`,
        title: "Có tin tức mới", message: shorten(post.title, 200),
      });
    });
  },

  /** A post that leaves the site (trash) should not keep pointing people to it. */
  withdrawMedia(mediaId: string): Promise<void> {
    return safely("thu hồi tin tức", async () => { await notificationRepository.removeByRef("news", mediaId); });
  },

  bookingConfirmed(accountId: string, booking: BookingRef): Promise<void> {
    return safely("đặt lịch họp", async () => {
      await notificationRepository.insertForAccounts([accountId], {
        type: "meeting-booked", refId: String(booking._id), link: "/account/meetings",
        title: "Đặt lịch họp thành công",
        message: shorten(`${booking.title} · ${roomName(booking.roomId)} · ${booking.start}–${booking.end}, ${toDisplayDate(booking.date)}`, 500),
      });
    });
  },

  meetingReminder(booking: BookingRef): Promise<void> {
    return safely("nhắc lịch họp", async () => {
      const accountId = await notificationRepository.activeAccountIdByEmail(booking.email);
      if (!accountId) return;
      await notificationRepository.insertForAccounts([accountId], {
        type: "meeting-reminder", refId: String(booking._id), link: "/account/meetings",
        title: `Cuộc họp bắt đầu sau ${MEETING_REMINDER_LEAD_MINUTES} phút`,
        message: shorten(`${booking.title} · ${roomName(booking.roomId)} · ${booking.start}–${booking.end}`, 500),
      });
    });
  },

  /** A cancelled meeting should not leave reminders behind. */
  withdrawBooking(bookingId: string): Promise<void> {
    return safely("thu hồi lịch họp", async () => {
      await Promise.all([
        notificationRepository.removeByRef("meeting-booked", bookingId),
        notificationRepository.removeByRef("meeting-reminder", bookingId),
      ]);
    });
  },

  async list(accountId: string, before?: Date) {
    const [rows, unread] = await Promise.all([
      notificationRepository.list(accountId, PAGE_SIZE + 1, before),
      notificationRepository.countUnread(accountId),
    ]);
    const items = rows.slice(0, PAGE_SIZE).map((row) => ({
      id: String(row._id), type: row.type, title: row.title, message: row.message, link: row.link,
      read: Boolean(row.readAt), createdAt: row.createdAt,
    }));
    return { items, unread, hasMore: rows.length > PAGE_SIZE };
  },

  unreadCount(accountId: string) {
    return notificationRepository.countUnread(accountId);
  },

  async markRead(accountId: string, id: string): Promise<boolean> {
    return Boolean(await notificationRepository.markRead(accountId, id));
  },

  async markAllRead(accountId: string): Promise<void> {
    await notificationRepository.markAllRead(accountId);
  },
};
