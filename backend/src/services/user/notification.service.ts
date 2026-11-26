import { MEETING_REMINDER_LEAD_MINUTES, MEETING_ROOMS } from "../../config/meeting.config";
import type { Media } from "../../interfaces/media.interface";
import type { MeetingBooking } from "../../interfaces/meeting.interface";
import { notificationRepository } from "../../repositories/user/notification.repository";
import type { NotificationScope } from "../../interfaces/notification.interface";

const PAGE_SIZE = 20;
const toDisplayDate = (date: string) => date.split("-").reverse().join("/");
const roomName = (roomId: string) => MEETING_ROOMS.find(({ id }) => id === roomId)?.name ?? "Phòng họp";
const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

type BookingRef = Pick<MeetingBooking, "title" | "roomId" | "date" | "start" | "end" | "email"> & { _id: unknown };
/** A meeting as the admin service returns it (id is the booking id used as refId). */
type AdminMeetingSnapshot = Pick<MeetingBooking, "title" | "roomId" | "date" | "start" | "end" | "email"> & { id: string };

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
        type: "news", refId, link: `/user/news/${refId}`,
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
        type: "meeting-booked", refId: String(booking._id), link: "/user/account/meetings",
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
        type: "meeting-reminder", refId: String(booking._id), link: "/user/account/meetings",
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
        notificationRepository.removeByRef("meeting-updated", bookingId),
      ]);
    });
  },

  /**
   * An admin changed a meeting: tells the person who booked it what changed. Only title, room,
   * date, time or booker email count (organizer/department edits stay silent). When the booker
   * email changed, the previous person is told the meeting is no longer theirs.
   */
  meetingUpdatedByAdmin(before: AdminMeetingSnapshot, after: AdminMeetingSnapshot): Promise<void> {
    return safely("admin sửa lịch họp", async () => {
      const changes: string[] = [];
      if (before.title !== after.title) changes.push(`Tiêu đề: ${before.title} → ${after.title}`);
      if (before.roomId !== after.roomId) changes.push(`Phòng: ${roomName(before.roomId)} → ${roomName(after.roomId)}`);
      if (before.date !== after.date || before.start !== after.start || before.end !== after.end) {
        changes.push(`Giờ: ${before.start}–${before.end} ${toDisplayDate(before.date)} → ${after.start}–${after.end} ${toDisplayDate(after.date)}`);
      }
      const emailChanged = before.email.trim().toLowerCase() !== after.email.trim().toLowerCase();
      if (!changes.length && !emailChanged) return;
      // The old reminder points to the old time; the reminder job sends a new one for the new time.
      if (before.date !== after.date || before.start !== after.start) await notificationRepository.removeByRef("meeting-reminder", after.id);
      if (emailChanged) {
        const previous = await notificationRepository.activeAccountIdByEmail(before.email);
        if (previous) {
          await Promise.all((["meeting-booked", "meeting-reminder", "meeting-updated"] as const).map((type) => notificationRepository.removeByRef(type, after.id)));
          await notificationRepository.replaceForAccounts([previous], {
            type: "meeting-cancelled", refId: after.id, link: "/user/account/meetings",
            title: "Lịch họp đã được chuyển cho người khác",
            message: shorten(`${before.title} · ${roomName(before.roomId)} · ${before.start}–${before.end}, ${toDisplayDate(before.date)}`, 500),
          });
        }
      }
      const accountId = await notificationRepository.activeAccountIdByEmail(after.email);
      if (!accountId) return;
      await notificationRepository.replaceForAccounts([accountId], {
        type: "meeting-updated", refId: after.id, link: "/user/account/meetings",
        title: emailChanged ? "Bạn được giao một lịch họp" : "Lịch họp của bạn đã được thay đổi",
        message: shorten([...changes, `${after.title} · ${roomName(after.roomId)} · ${after.start}–${after.end}, ${toDisplayDate(after.date)}`].join(" · "), 500),
      });
    });
  },

  /** An admin deleted a meeting that had not ended: earlier notices go, the booker is told. */
  meetingCancelledByAdmin(booking: AdminMeetingSnapshot): Promise<void> {
    return safely("admin xóa lịch họp", async () => {
      await Promise.all((["meeting-booked", "meeting-reminder", "meeting-updated"] as const).map((type) => notificationRepository.removeByRef(type, booking.id)));
      const accountId = await notificationRepository.activeAccountIdByEmail(booking.email);
      if (!accountId) return;
      await notificationRepository.replaceForAccounts([accountId], {
        type: "meeting-cancelled", refId: booking.id, link: "/user/account/meetings",
        title: "Lịch họp của bạn đã bị hủy",
        message: shorten(`${booking.title} · ${roomName(booking.roomId)} · ${booking.start}–${booking.end}, ${toDisplayDate(booking.date)} · Quản trị viên đã xóa lịch này.`, 500),
      });
    });
  },

  // scope: which bell asks. The user portal shows personal notices only; the admin portal shows
  // the work notices (those that open an /admin page). See notification.repository.ts.
  async list(accountId: string, before?: Date, scope: NotificationScope = "user") {
    const [rows, unread] = await Promise.all([
      notificationRepository.list(accountId, PAGE_SIZE + 1, before, scope),
      notificationRepository.countUnread(accountId, scope),
    ]);
    const items = rows.slice(0, PAGE_SIZE).map((row) => ({
      id: String(row._id), type: row.type, title: row.title, message: row.message, link: row.link,
      read: Boolean(row.readAt), createdAt: row.createdAt,
    }));
    return { items, unread, hasMore: rows.length > PAGE_SIZE };
  },

  unreadCount(accountId: string, scope: NotificationScope = "user") {
    return notificationRepository.countUnread(accountId, scope);
  },

  async markRead(accountId: string, id: string, scope: NotificationScope = "user"): Promise<boolean> {
    return Boolean(await notificationRepository.markRead(accountId, id, scope));
  },

  async deleteOne(accountId: string, id: string, scope: NotificationScope = "user"): Promise<boolean> {
    return Boolean(await notificationRepository.deleteOne(accountId, id, scope));
  },

  async deleteAll(accountId: string, scope: NotificationScope = "user"): Promise<void> {
    await notificationRepository.deleteAll(accountId, scope);
  },

  async markAllRead(accountId: string, scope: NotificationScope = "user"): Promise<void> {
    await notificationRepository.markAllRead(accountId, scope);
  },
};
