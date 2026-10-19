jest.mock("../src/repositories/admin/media.repository", () => ({
  adminMediaRepository: {
    permanentlyDeleteById: jest.fn(),
    findAllForSearch: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
  },
}));

jest.mock("../src/services/admin/media-asset.service", () => ({
  mediaAssetService: {
    findManagedPublicIds: jest.fn().mockResolvedValue([]),
    prepareForReference: jest.fn().mockResolvedValue(undefined),
    synchronizeReferenceStatuses: jest.fn().mockResolvedValue(undefined),
  },
}));

import { adminMediaRepository } from "../src/repositories/admin/media.repository";
import { adminMediaService } from "../src/services/admin/media.service";
import type { CreateMediaInput } from "../src/interfaces/media.interface";

const mediaId = "507f1f77bcf86cd799439011";
const post = { _id: mediaId, title: "Bài viết", summary: "<p>Tóm tắt</p>" };

describe("admin media delete flow", () => {
  beforeEach(() => jest.clearAllMocks());

  it("xóa vĩnh viễn trực tiếp qua repository", async () => {
    jest.mocked(adminMediaRepository.permanentlyDeleteById).mockResolvedValue(post as never);
    await expect(adminMediaService.permanentlyDeleteMedia(mediaId)).resolves.toEqual({ ...post, isExpired: false });
  });

  it("trả 404 khi bài viết không tồn tại", async () => {
    jest.mocked(adminMediaRepository.permanentlyDeleteById).mockResolvedValue(null);
    await expect(adminMediaService.permanentlyDeleteMedia(mediaId)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("admin media expiry dates", () => {
  const data: CreateMediaInput = {
    title: "Thông báo nội bộ", summary: "<p>Thông báo mới.</p>", content: "", coverImage: "",
    category: "Thông báo", authorDepartment: "Phòng HR&AD", status: "published",
    publishDate: new Date("2026-10-19"), expiryDate: new Date("2026-10-20"), publishIndefinitely: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(adminMediaRepository.findById).mockResolvedValue({ _id: mediaId, ...data } as never);
    jest.mocked(adminMediaRepository.create).mockImplementation(async (value) => ({ _id: mediaId, ...value }) as never);
    jest.mocked(adminMediaRepository.updateById).mockImplementation((_id, value) => Promise.resolve({ _id, ...data, ...value }) as never);
  });

  it("lưu ngày hết hạn và chế độ đăng vĩnh viễn", async () => {
    const result = await adminMediaService.createMedia({ ...data, publishIndefinitely: true });
    expect(result.expiryDate).toEqual(data.expiryDate);
    expect(result.publishIndefinitely).toBe(true);
  });

  it("chặn sửa riêng ngày hết hạn về trước hoặc bằng ngày đăng đang lưu", async () => {
    await expect(adminMediaService.updateMedia(mediaId, { expiryDate: data.publishDate })).rejects.toMatchObject({ statusCode: 400 });
    expect(adminMediaRepository.updateById).not.toHaveBeenCalled();
  });

  it("chặn sửa riêng ngày đăng vượt qua ngày hết hạn đang lưu", async () => {
    await expect(adminMediaService.updateMedia(mediaId, { publishDate: new Date("2026-10-21") })).rejects.toMatchObject({ statusCode: 400 });
    expect(adminMediaRepository.updateById).not.toHaveBeenCalled();
  });

  it("cho phép bỏ ngày hết hạn khi chuyển sang đăng vĩnh viễn", async () => {
    const result = await adminMediaService.updateMedia(mediaId, { expiryDate: null, publishIndefinitely: true });
    expect(result.expiryDate).toBeNull();
    expect(result.publishIndefinitely).toBe(true);
  });

  it("giữ nguyên ngày hết hạn khi chỉ sửa nội dung hoặc trạng thái", async () => {
    const result = await adminMediaService.updateMedia(mediaId, { status: "draft" });
    expect(result.expiryDate).toEqual(data.expiryDate);
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
