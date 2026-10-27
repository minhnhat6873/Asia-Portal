import { userMediaRepository } from "../src/repositories/user/media.repository";
import { getMediaExpiryCutoff, withMediaExpiry } from "../src/utils/media/validateMediaDates";
import { adminMediaRepository } from "../src/repositories/admin/media.repository";
import MediaModel from "../src/models/media.model";

describe("media expiry visibility", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-19T17:00:00Z")); });
  afterEach(() => jest.useRealTimers());

  it("keeps the selected expiry day valid in Vietnam regardless of the host timezone", () => {
    expect(getMediaExpiryCutoff(new Date("2026-10-19T16:59:59Z"))).toEqual(new Date("2026-10-19"));
    expect(getMediaExpiryCutoff()).toEqual(new Date("2026-10-20"));
    expect(withMediaExpiry({ expiryDate: new Date("2026-10-20") }).isExpired).toBe(false);
    expect(withMediaExpiry({ expiryDate: new Date("2026-10-19") }).isExpired).toBe(true);
    expect(withMediaExpiry({ expiryDate: new Date("2026-10-21") }).isExpired).toBe(false);
    expect(withMediaExpiry({ expiryDate: null }).isExpired).toBe(false);
  });

  it.each([
    ["2026-10-19T16:59:59.999Z", false],
    ["2026-10-19T17:00:00.000Z", false],
    ["2026-10-20T16:59:59.999Z", false],
    ["2026-10-20T17:00:00.000Z", true],
  ])("checks expiry on October 20 at %s: %s", (now, isExpired) => {
    jest.setSystemTime(new Date(now));
    expect(withMediaExpiry({ expiryDate: new Date("2026-10-20") }).isExpired).toBe(isExpired);
  });

  it("keeps permanent posts published even after their old expiry date", () => {
    const post = { status: "published", expiryDate: new Date("2026-10-19"), publishIndefinitely: true };
    expect(withMediaExpiry(post)).toEqual({ ...post, isExpired: false });
  });

  it("auto-hides only expired published posts, excluding permanent and deleted posts", async () => {
    const update = jest.spyOn(MediaModel, "updateMany").mockResolvedValue({ modifiedCount: 1 } as never);
    await adminMediaRepository.hideExpiredPosts();
    expect(update).toHaveBeenCalledWith({
      status: "published", isDeleted: { $ne: true }, publishIndefinitely: { $ne: true },
      expiryDate: { $lt: new Date("2026-10-20") },
    }, { $set: { status: "draft" } });
    update.mockRestore();
  });

  it("applies the same visibility rule to lists, search, counts, and direct URLs", () => {
    const cutoff = new Date("2026-10-20");
    const queries = [
      userMediaRepository.findAll({ filter: { category: "Tin tức" }, skip: 0, limit: 12, sort: { publishDate: -1 } }),
      userMediaRepository.findAllForSearch({}, { publishDate: -1 }),
      userMediaRepository.count({}),
      userMediaRepository.findById("507f1f77bcf86cd799439011"),
    ];
    for (const query of queries) {
      expect(query.getFilter()).toMatchObject({
        $and: [expect.any(Object), {
          status: "published", isDeleted: { $ne: true },
          $or: [{ expiryDate: null }, { expiryDate: { $gte: cutoff } }, { publishIndefinitely: true }],
        }],
      });
    }
    expect(queries[0].getFilter().$and?.[0]).toEqual({ category: "Tin tức" });
    expect(queries[3].getFilter().$and?.[0]).toEqual({ _id: "507f1f77bcf86cd799439011" });
  });
});
