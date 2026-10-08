jest.mock("../src/repositories/admin/media.repository", () => ({
  adminMediaRepository: {
    permanentlyDeleteById: jest.fn(),
    findAllForSearch: jest.fn(),
  },
}));

import { adminMediaRepository } from "../src/repositories/admin/media.repository";
import { adminMediaService } from "../src/services/admin/media.service";

const mediaId = "507f1f77bcf86cd799439011";
const post = { _id: mediaId, title: "Bài viết", summary: "<p>Tóm tắt</p>" };

describe("admin media delete flow", () => {
  beforeEach(() => jest.clearAllMocks());

  it("xóa vĩnh viễn trực tiếp qua repository", async () => {
    jest.mocked(adminMediaRepository.permanentlyDeleteById).mockResolvedValue(post as never);
    await expect(adminMediaService.permanentlyDeleteMedia(mediaId)).resolves.toEqual(post);
  });

  it("trả 404 khi bài viết không tồn tại", async () => {
    jest.mocked(adminMediaRepository.permanentlyDeleteById).mockResolvedValue(null);
    await expect(adminMediaService.permanentlyDeleteMedia(mediaId)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("admin media normalized search", () => {
  beforeEach(() => jest.clearAllMocks());

  it("chỉ tìm theo tiêu đề và Sapo, không phân biệt dấu", async () => {
    jest.mocked(adminMediaRepository.findAllForSearch).mockResolvedValue([
      { title: "Sản phẩm mới", summary: "<p>Nguồn nguyên liệu thuần Việt</p>", authorDepartment: "MKT" },
      { title: "Thông báo", summary: "<p>Lịch nghỉ lễ</p>", authorDepartment: "Nguyên liệu thuần Việt" },
    ] as never);

    const result = await adminMediaService.getMedia({ search: "  NGUYEN lieu   thuan viet " });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Sản phẩm mới");
  });
});
