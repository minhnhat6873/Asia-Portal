import NotificationModel from "../src/models/notification.model";
import { notificationRepository } from "../src/repositories/user/notification.repository";

/** The query each bell sends: split by whether the notice opens an /admin page. */
function filterFor(scope: "user" | "admin") {
  const query = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn() };
  const find = jest.spyOn(NotificationModel, "find").mockReturnValue(query as never);
  void notificationRepository.list("a1", 10, undefined, scope);
  const filter = find.mock.calls[0]![0] as unknown as { link: RegExp | { $not: RegExp } };
  find.mockRestore();
  return filter.link;
}

it("HR work notices (links to /admin) only in the admin bell; the rest only in the user bell", () => {
  const admin = filterFor("admin") as RegExp;
  const user = (filterFor("user") as { $not: RegExp }).$not;
  for (const link of ["/admin/vehicles?id=6b07a4fc68a23da898869ff4", "/admin", "/admin/vehicles"]) {
    expect(admin.test(link)).toBe(true);
    expect(user.test(link)).toBe(true); // excluded from the user bell by $not
  }
  for (const link of ["/user/account/trips", "/user/news/1", "/user/account/meetings", "/administration"]) {
    expect(admin.test(link)).toBe(false);
  }
});

it("deleting one notice is limited to its owner and its bell; a bad id deletes nothing", async () => {
  const query = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) };
  const remove = jest.spyOn(NotificationModel, "findOneAndDelete").mockReturnValue(query as never);
  await notificationRepository.deleteOne("a1", "6b07a4fc68a23da898869ff4");
  expect(remove).toHaveBeenCalledWith(expect.objectContaining({ _id: "6b07a4fc68a23da898869ff4", accountId: "a1", link: { $not: expect.any(RegExp) } }));
  remove.mockClear();
  await expect(notificationRepository.deleteOne("a1", "not-an-id")).resolves.toBeNull();
  expect(remove).not.toHaveBeenCalled();
  remove.mockRestore();
});
