jest.mock("../src/repositories/admin/media.repository", () => ({
  adminMediaRepository: {
    hideExpiredPosts: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    findAll: jest.fn(),
    count: jest.fn(),
    permanentlyDeleteById: jest.fn(),
    findAllForSearch: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    softDeleteById: jest.fn(),
    restoreById: jest.fn(),
    hasCoverReference: jest.fn(),
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
import * as cloudinaryHelpers from "../src/helpers/multerCloudinary.helper";
import { mediaAssetService } from "../src/services/admin/media-asset.service";

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

  it("xóa mềm giữ nội dung và ảnh, ghi người xóa từ phiên đăng nhập", async () => {
    const actor = { accountId: mediaId, name: "Manager", email: "manager@asiafnb.com" };
    jest.mocked(adminMediaRepository.softDeleteById).mockResolvedValue({ ...post, isDeleted: true, status: "draft", coverImage: "cover.jpg", deletedBy: actor } as never);
    await expect(adminMediaService.softDeleteMedia(mediaId, actor)).resolves.toMatchObject({ isDeleted: true, status: "draft", coverImage: "cover.jpg", deletedBy: actor });
    expect(adminMediaRepository.softDeleteById).toHaveBeenCalledWith(mediaId, actor);
    expect(adminMediaRepository.permanentlyDeleteById).not.toHaveBeenCalled();
    expect(mediaAssetService.synchronizeReferenceStatuses).not.toHaveBeenCalled();
  });

  it.each(["softDeleteMedia", "restoreMedia", "permanentlyDeleteMedia"] as const)("%s từ chối ID không hợp lệ", async (action) => {
    if (action === "softDeleteMedia") await expect(adminMediaService[action]("bad-id", { accountId: mediaId, name: "Manager", email: "m@asiafnb.com" })).rejects.toMatchObject({ statusCode: 400 });
    else await expect(adminMediaService[action]("bad-id")).rejects.toMatchObject({ statusCode: 400 });
    expect(adminMediaRepository.restoreById).not.toHaveBeenCalled();
    expect(adminMediaRepository.permanentlyDeleteById).not.toHaveBeenCalled();
  });

  it("khôi phục bài hết hạn vẫn chỉ về Ẩn tin và không gia hạn thay người dùng", async () => {
    const restored = { ...post, isDeleted: false, status: "draft", expiryDate: new Date("2000-01-01") };
    jest.mocked(adminMediaRepository.restoreById).mockResolvedValue(restored as never);
    await expect(adminMediaService.restoreMedia(mediaId)).resolves.toMatchObject({ status: "draft", isExpired: true, expiryDate: restored.expiryDate });
  });

  it("khôi phục lặp hoặc xóa vĩnh viễn bài không còn trong thùng rác trả 404", async () => {
    jest.mocked(adminMediaRepository.restoreById).mockResolvedValue(null);
    jest.mocked(adminMediaRepository.permanentlyDeleteById).mockResolvedValue(null);
    await expect(adminMediaService.restoreMedia(mediaId)).rejects.toMatchObject({ statusCode: 404 });
    await expect(adminMediaService.permanentlyDeleteMedia(mediaId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("đọc thùng rác chỉ lọc bài đã xóa và sắp theo ngày xóa", async () => {
    jest.mocked(adminMediaRepository.findAll).mockResolvedValue([]);
    jest.mocked(adminMediaRepository.count).mockResolvedValue(0);
    await adminMediaService.getMedia({}, true);
    expect(adminMediaRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ filter: { isDeleted: true }, sort: { deletedAt: -1 } }));
  });
});

describe("safe cover cleanup", () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => jest.clearAllMocks());
  it("không suy ra ID từ URL do client cung cấp hoặc xóa ảnh ngoài thư mục media", async () => {
    const destroy = jest.spyOn(cloudinaryHelpers, "deleteCloudinaryAsset").mockResolvedValue(undefined);
    await adminMediaService.cleanupCover({ coverImage: "https://evil.test/image/upload/asia-portal/avatars/victim.jpg" });
    await adminMediaService.cleanupCover({ coverImage: "", coverImagePublicId: "asia-portal/avatars/victim" });
    expect(destroy).not.toHaveBeenCalled();
  });
  it("chỉ dọn ảnh do hệ thống ghi nhận khi không bài nào còn tham chiếu", async () => {
    const destroy = jest.spyOn(cloudinaryHelpers, "deleteCloudinaryAsset").mockResolvedValue(undefined);
    const cover = { coverImage: "https://res.cloudinary.com/demo/image/upload/cover.jpg", coverImagePublicId: "asia-portal/media/owned" };
    jest.mocked(adminMediaRepository.hasCoverReference).mockResolvedValue({ _id: mediaId } as never);
    await adminMediaService.cleanupCover(cover);
    expect(destroy).not.toHaveBeenCalled();
    jest.mocked(adminMediaRepository.hasCoverReference).mockResolvedValue(null);
    await adminMediaService.cleanupCover(cover);
    expect(destroy).toHaveBeenCalledWith(cover.coverImagePublicId);
  });
});

describe("admin media expiry dates", () => {
  const data: CreateMediaInput = {
    title: "Thông báo nội bộ", summary: "<p>Thông báo mới.</p>", content: "", coverImage: "",
    category: "Thông báo", authorDepartment: "Phòng HR&AD", status: "published",
    publishDate: new Date("2026-10-19"), expiryDate: new Date("2026-10-20"), publishIndefinitely: false,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-19T05:00:00Z"));
    jest.clearAllMocks();
    jest.mocked(adminMediaRepository.findById).mockResolvedValue({ _id: mediaId, ...data } as never);
    jest.mocked(adminMediaRepository.create).mockImplementation(async (value) => ({ _id: mediaId, ...value }) as never);
    jest.mocked(adminMediaRepository.updateById).mockImplementation((_id, value) => Promise.resolve({ _id, ...data, ...value }) as never);
  });
  afterEach(() => jest.useRealTimers());

  it("chuẩn hóa bài đăng vĩnh viễn về ngày hết hạn null", async () => {
    const result = await adminMediaService.createMedia({ ...data, publishIndefinitely: true });
    expect(result.expiryDate).toBeNull();
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

  it("bỏ ngày hết hạn khi chuyển sang đăng vĩnh viễn", async () => {
    await expect(adminMediaService.updateMedia(mediaId, { expiryDate: null, publishIndefinitely: true })).resolves.toMatchObject({ expiryDate: null, publishIndefinitely: true, isExpired: false });
  });

  it("chỉ tạo bài thiếu ngày hết hạn khi đăng vĩnh viễn", async () => {
    await expect(adminMediaService.createMedia({ ...data, expiryDate: undefined, publishIndefinitely: false })).rejects.toMatchObject({ statusCode: 400 });
    expect(adminMediaRepository.create).not.toHaveBeenCalled();
    await expect(adminMediaService.createMedia({ ...data, expiryDate: undefined, publishIndefinitely: true })).resolves.toMatchObject({ expiryDate: null, publishIndefinitely: true });
  });

  it("bỏ đăng vĩnh viễn phải chọn lại ngày hết hạn", async () => {
    jest.mocked(adminMediaRepository.findById).mockResolvedValue({ _id: mediaId, ...data, publishIndefinitely: true, expiryDate: null } as never);
    await expect(adminMediaService.updateMedia(mediaId, { publishIndefinitely: false })).rejects.toMatchObject({ statusCode: 400 });
    expect(adminMediaRepository.updateById).not.toHaveBeenCalled();
    await expect(adminMediaService.updateMedia(mediaId, { publishIndefinitely: false, expiryDate: data.expiryDate })).resolves.toMatchObject({ publishIndefinitely: false, expiryDate: data.expiryDate });
  });

  it("bài cũ thiếu ngày hết hạn phải bổ sung trước khi sửa hoặc đăng, nhưng vẫn được ẩn", async () => {
    jest.mocked(adminMediaRepository.findById).mockResolvedValue({ _id: mediaId, ...data, expiryDate: null } as never);
    await expect(adminMediaService.updateMedia(mediaId, { title: "Tiêu đề mới" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(adminMediaService.updateMedia(mediaId, { status: "published" })).rejects.toMatchObject({ statusCode: 400 });
    expect(adminMediaRepository.updateById).not.toHaveBeenCalled();
    await expect(adminMediaService.updateMedia(mediaId, { status: "draft" })).resolves.toMatchObject({ status: "draft" });
  });

  it("giữ nguyên ngày hết hạn khi chỉ sửa nội dung hoặc trạng thái", async () => {
    const result = await adminMediaService.updateMedia(mediaId, { status: "draft" });
    expect(result.expiryDate).toEqual(data.expiryDate);
  });

  it("chặn đăng lại bài hết hạn và hướng dẫn người dùng", async () => {
    jest.setSystemTime(new Date("2026-10-20T17:00:00Z"));
    await expect(adminMediaService.updateMedia(mediaId, { status: "published" })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("Đăng tin vĩnh viễn"),
    });
    expect(adminMediaRepository.updateById).not.toHaveBeenCalled();
  });

  it("chặn tạo bài published đã hết hạn", async () => {
    jest.setSystemTime(new Date("2026-10-20T17:00:00Z"));
    await expect(adminMediaService.createMedia(data)).rejects.toMatchObject({ statusCode: 400 });
    expect(adminMediaRepository.create).not.toHaveBeenCalled();
  });

  it("chuyển bài hết hạn về draft khi sửa nội dung, vẫn cho lưu để chỉnh sửa tiếp", async () => {
    jest.setSystemTime(new Date("2026-10-20T17:00:00Z"));
    await adminMediaService.updateMedia(mediaId, { title: "Tiêu đề mới" });
    expect(adminMediaRepository.updateById).toHaveBeenCalledWith(mediaId, expect.objectContaining({ status: "draft" }), undefined);
  });

  it.each([
    { status: "published" as const, publishIndefinitely: true },
    { status: "published" as const, expiryDate: new Date("2026-10-25") },
  ])("cho đăng lại sau khi đổi thời hạn hoặc chọn vĩnh viễn: %j", async (input) => {
    jest.setSystemTime(new Date("2026-10-20T17:00:00Z"));
    await expect(adminMediaService.updateMedia(mediaId, input)).resolves.toMatchObject({ status: "published", isExpired: false });
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
    expect(adminMediaRepository.hideExpiredPosts).toHaveBeenCalledTimes(1);
  });

  it("ẩn bài hết hạn trước khi lọc trạng thái và tính phân trang", async () => {
    jest.mocked(adminMediaRepository.findAll).mockResolvedValue([]);
    jest.mocked(adminMediaRepository.count).mockResolvedValue(0);
    await adminMediaService.getMedia({ status: "published" });
    expect(jest.mocked(adminMediaRepository.hideExpiredPosts).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(adminMediaRepository.findAll).mock.invocationCallOrder[0]!,
    );
    expect(adminMediaRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ filter: { isDeleted: { $ne: true }, status: "published" } }));
  });
});
