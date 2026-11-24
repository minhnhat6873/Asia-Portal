import { notificationRepository } from "../src/repositories/user/notification.repository";
import { notificationService } from "../src/services/user/notification.service";

jest.mock("../src/repositories/user/notification.repository", () => ({ notificationRepository: {
  claimMediaAnnouncement: jest.fn(), activeAccountIds: jest.fn(), activeAccountIdByEmail: jest.fn(),
  insertForAccounts: jest.fn(), removeByRef: jest.fn(), list: jest.fn(), countUnread: jest.fn(),
  markRead: jest.fn(), markAllRead: jest.fn(),
} }));

const repo = jest.mocked(notificationRepository);
const post = { _id: "507f1f77bcf86cd799439011", title: "Thông báo nghỉ lễ", status: "published" as const };
const booking = { _id: "507f1f77bcf86cd799439022", title: "Họp tuần", roomId: "room-01" as const, date: "2026-11-25", start: "09:00", end: "10:00", email: "an@asiafnb.com" };

beforeEach(() => {
  jest.clearAllMocks();
  repo.activeAccountIds.mockResolvedValue(["a1", "a2"]);
  repo.insertForAccounts.mockResolvedValue(undefined);
});

it("announces a newly published post to every active account, once", async () => {
  repo.claimMediaAnnouncement.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await notificationService.announceMedia(post);
  await notificationService.announceMedia(post);
  expect(repo.insertForAccounts).toHaveBeenCalledTimes(1);
  expect(repo.insertForAccounts).toHaveBeenCalledWith(["a1", "a2"], expect.objectContaining({
    type: "news", refId: post._id, link: `/news/${post._id}`, message: post.title,
  }));
});

it("does not announce drafts", async () => {
  await notificationService.announceMedia({ ...post, status: "draft" });
  expect(repo.claimMediaAnnouncement).not.toHaveBeenCalled();
  expect(repo.insertForAccounts).not.toHaveBeenCalled();
});

it("sends the 15-minute reminder to the account with the booking email", async () => {
  repo.activeAccountIdByEmail.mockResolvedValue("a9");
  await notificationService.meetingReminder(booking);
  expect(repo.activeAccountIdByEmail).toHaveBeenCalledWith(booking.email);
  expect(repo.insertForAccounts).toHaveBeenCalledWith(["a9"], expect.objectContaining({
    type: "meeting-reminder", refId: booking._id, title: "Cuộc họp bắt đầu sau 15 phút",
  }));
});

it("skips the website reminder when no active account has that email", async () => {
  repo.activeAccountIdByEmail.mockResolvedValue(null);
  await notificationService.meetingReminder(booking);
  expect(repo.insertForAccounts).not.toHaveBeenCalled();
});

it("never throws: a notification failure must not break publishing or booking", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
  repo.claimMediaAnnouncement.mockRejectedValue(new Error("db down"));
  repo.insertForAccounts.mockRejectedValue(new Error("db down"));
  await expect(notificationService.announceMedia(post)).resolves.toBeUndefined();
  await expect(notificationService.bookingConfirmed("a1", booking)).resolves.toBeUndefined();
  expect(log).toHaveBeenCalled();
  log.mockRestore();
});

it("withdraws booking notifications when a meeting is cancelled", async () => {
  await notificationService.withdrawBooking(booking._id);
  expect(repo.removeByRef).toHaveBeenCalledWith("meeting-booked", booking._id);
  expect(repo.removeByRef).toHaveBeenCalledWith("meeting-reminder", booking._id);
});
