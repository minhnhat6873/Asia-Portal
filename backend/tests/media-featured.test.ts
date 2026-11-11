jest.mock("../src/repositories/user/media.repository", () => ({
  userMediaRepository: { findAll: jest.fn(), count: jest.fn(), findAllForSearch: jest.fn() },
}));

import { userMediaRepository } from "../src/repositories/user/media.repository";
import { userMediaService } from "../src/services/user/media.service";
import { createMediaSchema, mediaListQuerySchema, updateMediaSchema } from "../src/validates/admin/media.validate";

it("lấy bài nổi bật theo thứ tự vị trí, không theo ngày đăng", async () => {
  jest.mocked(userMediaRepository.findAll).mockResolvedValue([]);
  jest.mocked(userMediaRepository.count).mockResolvedValue(0);
  await userMediaService.getMedia({ featured: "true", limit: "5" });
  expect(userMediaRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({
    filter: { featured: true }, limit: 5, sort: { featuredSlot: 1, featuredAt: -1, _id: -1 },
  }));
});

it("cho chọn nổi bật nhưng không cho client đặt thời điểm bật", () => {
  const { error, value } = updateMediaSchema.validate({ featured: true, featuredAt: "2030-01-01" }, { stripUnknown: true });
  expect(error).toBeUndefined();
  expect(value).toEqual({ featured: true });
  expect(mediaListQuerySchema.validate({ featured: "true", limit: "5" }).error).toBeUndefined();
  expect(createMediaSchema.validate({}).error).toBeDefined();
});
