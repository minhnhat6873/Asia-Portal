jest.mock("../src/repositories/user/media.repository", () => ({
  userMediaRepository: { findAll: jest.fn(), count: jest.fn(), findAllForSearch: jest.fn(), findById: jest.fn() },
}));

import { userMediaRepository } from "../src/repositories/user/media.repository";
import { userMediaService } from "../src/services/user/media.service";
import { createMediaSchema, mediaListQuerySchema, updateMediaSchema } from "../src/validates/admin/media.validate";

const post = (id: string, extra: object = {}) => ({ _id: id, title: `Bài ${id}`, ...extra });

it("lấy tối đa 3 bài nổi bật theo thứ tự vị trí, không theo ngày bật", async () => {
  jest.mocked(userMediaRepository.findAll).mockReset();
  jest.mocked(userMediaRepository.findAll).mockResolvedValueOnce([
    post("c", { featured: true, featuredSlot: 3 }), post("a", { featured: true, featuredSlot: 1 }), post("b", { featured: true, featuredSlot: 2 }),
  ] as never);
  const result = await userMediaService.getMedia({ featured: "true", limit: "5" }, true);
  expect(result.items.map((item) => item._id)).toEqual(["a", "b", "c"]);
  expect(userMediaRepository.findAll).toHaveBeenCalledTimes(1);
  expect(userMediaRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ filter: { featured: true } }));
});

it("chưa đủ 3 bài nổi bật thì lấy bài mới nhất bù vào, không trùng bài đã chọn", async () => {
  jest.mocked(userMediaRepository.findAll).mockReset();
  jest.mocked(userMediaRepository.findAll)
    .mockResolvedValueOnce([post("x", { featured: true, featuredSlot: 2 })] as never)
    .mockResolvedValueOnce([post("n1"), post("n2")] as never);
  const result = await userMediaService.getMedia({ featured: "true" }, true);
  expect(result.items.map((item) => item._id)).toEqual(["x", "n1", "n2"]);
  expect(userMediaRepository.findAll).toHaveBeenLastCalledWith(expect.objectContaining({
    filter: { _id: { $nin: ["x"] } }, limit: 2, sort: { publishDate: -1, _id: -1 },
  }));
});

it("không chọn bài nổi bật nào thì hiện 3 bài mới nhất", async () => {
  jest.mocked(userMediaRepository.findAll).mockReset();
  jest.mocked(userMediaRepository.findAll).mockResolvedValueOnce([] as never).mockResolvedValueOnce([post("n1"), post("n2"), post("n3")] as never);
  const result = await userMediaService.getMedia({ featured: "true" }, true);
  expect(result.items.map((item) => item._id)).toEqual(["n1", "n2", "n3"]);
  expect(userMediaRepository.findAll).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 3 }));
});

it("vị trí nổi bật chỉ từ 1 đến 3", () => {
  expect(updateMediaSchema.validate({ featured: true, featuredSlot: 3 }).error).toBeUndefined();
  expect(updateMediaSchema.validate({ featured: true, featuredSlot: 4 }).error?.message).toContain("từ 1 đến 3");
});

it("cho chọn nổi bật nhưng không cho client đặt thời điểm bật", () => {
  const { error, value } = updateMediaSchema.validate({ featured: true, featuredAt: "2030-01-01" }, { stripUnknown: true });
  expect(error).toBeUndefined();
  expect(value).toEqual({ featured: true });
  expect(mediaListQuerySchema.validate({ featured: "true", limit: "5" }).error).toBeUndefined();
  expect(createMediaSchema.validate({}).error).toBeDefined();
});

it("bài nội bộ (hoặc bài cũ chưa đặt phạm vi) yêu cầu đăng nhập; bài công khai ai cũng xem được", async () => {
  const id = "507f1f77bcf86cd799439011";
  jest.mocked(userMediaRepository.findById).mockResolvedValue({ _id: id, title: "Tin", visibility: "internal" } as never);
  await expect(userMediaService.getMediaById(id)).rejects.toMatchObject({ statusCode: 401 });
  await expect(userMediaService.getMediaById(id, true)).resolves.toMatchObject({ title: "Tin" });
  jest.mocked(userMediaRepository.findById).mockResolvedValue({ _id: id, title: "Tin cũ" } as never);
  await expect(userMediaService.getMediaById(id)).rejects.toMatchObject({ statusCode: 401 });
  jest.mocked(userMediaRepository.findById).mockResolvedValue({ _id: id, title: "Tin", visibility: "public" } as never);
  await expect(userMediaService.getMediaById(id)).resolves.toMatchObject({ title: "Tin" });
});

it("phạm vi hiển thị mặc định là nội bộ và chỉ nhận public/internal", () => {
  expect(createMediaSchema.extract("visibility").validate(undefined).value).toBe("internal");
  expect(updateMediaSchema.validate({ visibility: "secret" }).error?.message).toContain("Công khai hoặc Nội bộ");
  expect(updateMediaSchema.validate({ visibility: "public" }).error).toBeUndefined();
});

it("khách chưa đăng nhập chỉ nhận bài công khai, kể cả khi tìm kiếm", async () => {
  jest.mocked(userMediaRepository.findAll).mockReset();
  jest.mocked(userMediaRepository.findAll).mockResolvedValue([]);
  jest.mocked(userMediaRepository.count).mockResolvedValue(0);
  jest.mocked(userMediaRepository.findAllForSearch).mockResolvedValue([]);
  await userMediaService.getMedia({ featured: "true", limit: "5" });
  expect(userMediaRepository.findAll).toHaveBeenNthCalledWith(1, expect.objectContaining({ filter: { visibility: "public", featured: true } }));
  // Fill-in posts for guests are public too.
  expect(userMediaRepository.findAll).toHaveBeenNthCalledWith(2, expect.objectContaining({ filter: { visibility: "public", _id: { $nin: [] } } }));
  await userMediaService.getMedia({ search: "abc" });
  expect(userMediaRepository.findAllForSearch).toHaveBeenLastCalledWith({ visibility: "public" }, expect.anything());
  await userMediaService.getMedia({ search: "abc" }, true);
  expect(userMediaRepository.findAllForSearch).toHaveBeenLastCalledWith({}, expect.anything());
});
