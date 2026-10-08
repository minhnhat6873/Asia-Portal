import { createMediaSchema } from "../src/validates/admin/media.validate";

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
});
