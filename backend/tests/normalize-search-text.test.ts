import { normalizeSearchText } from "../src/utils/text/normalizeSearchText";

describe("normalize search text", () => {
  it("bỏ dấu, chuẩn hóa đ, chữ hoa và khoảng trắng", () => {
    expect(normalizeSearchText("  ĐẶNG   Nguyễn  ")).toBe("dang nguyen");
  });

  it("chuẩn hóa cả chữ Đ hoa và cho phép partial match", () => {
    expect(normalizeSearchText("  ĐỖ   THỊ ")).toBe("do thi");
    expect(normalizeSearchText("do").includes(normalizeSearchText("Đỗ"))).toBe(true);
  });

  it("loại markup trong Sapo trước khi so sánh", () => {
    expect(normalizeSearchText("<p>Chương <strong>trình</strong>&nbsp;mới</p>"))
      .toBe("chuong trinh moi");
  });
});
