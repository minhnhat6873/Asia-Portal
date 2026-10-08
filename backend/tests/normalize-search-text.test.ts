import { normalizeSearchText } from "../src/utils/text/normalizeSearchText";

describe("normalize search text", () => {
  it("bỏ dấu, chuẩn hóa đ, chữ hoa và khoảng trắng", () => {
    expect(normalizeSearchText("  ĐẶNG   Nguyễn  ")).toBe("dang nguyen");
  });

  it("loại markup trong Sapo trước khi so sánh", () => {
    expect(normalizeSearchText("<p>Chương <strong>trình</strong>&nbsp;mới</p>"))
      .toBe("chuong trinh moi");
  });
});
