import { createMediaSchema, updateMediaSchema } from "../src/validates/admin/media.validate";

const validMedia = {
  title: "Bài viết truyền thông mới",
  category: "Tin tức",
  summary: "<p>Tóm tắt bài viết.</p>",
  content: "<p>Nội dung chi tiết.</p>",
  authorDepartment: "Phòng MKT",
  publishDate: "2026-10-07",
  status: "published",
};

describe("media validation", () => {
  it("chấp nhận bài viết hợp lệ", () => {
    expect(createMediaSchema.validate(validMedia).error).toBeUndefined();
  });

  it("mặc định bài viết mới là bản nháp", () => {
    const { status: _status, ...withoutStatus } = validMedia;
    expect(createMediaSchema.validate(withoutStatus).value.status).toBe("draft");
  });

  it("từ chối chuyên mục không hợp lệ", () => {
    const result = createMediaSchema.validate({ ...validMedia, category: "Khác" });
    expect(result.error?.details.some((detail) => detail.path[0] === "category")).toBe(true);
  });

  it("chấp nhận ngày hết hạn sau ngày đăng và checkbox gửi qua multipart", () => {
    const result = createMediaSchema.validate({ ...validMedia, expiryDate: "2026-10-08", publishIndefinitely: "true" });
    expect(result.error).toBeUndefined();
    expect(result.value.expiryDate).toEqual(new Date("2026-10-08"));
    expect(result.value.publishIndefinitely).toBe(true);
  });

  it.each(["2026-10-06", "2026-10-07", "2026-10-07T23:59:00Z"])("từ chối ngày hết hạn %s không sau ngày đăng", (expiryDate) => {
    expect(createMediaSchema.validate({ ...validMedia, expiryDate }).error?.message).toContain("sau ngày đăng");
    expect(updateMediaSchema.validate({ publishDate: validMedia.publishDate, expiryDate }).error?.message).toContain("sau ngày đăng");
  });

  it("không tự xóa ngày hết hạn hoặc đổi chế độ khi PATCH không có hai trường này", () => {
    const result = updateMediaSchema.validate({ title: "Tiêu đề mới" });
    expect(result.error).toBeUndefined();
    expect(result.value).not.toHaveProperty("expiryDate");
    expect(result.value).not.toHaveProperty("publishIndefinitely");
    expect(updateMediaSchema.validate({ expiryDate: null }).value.expiryDate).toBeNull();
  });
});
