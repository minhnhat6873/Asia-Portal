import { vietnameseSearchRegex } from "../src/utils/text/vietnameseSearchRegex";

describe("tìm kiếm người đặt và khách hàng", () => {
  it.each([
    ["nguyen van", "Nguyễn Văn An"],
    ["NGUYỄN VĂN", "nguyen van an"],
    ["doan", "Đoàn"],
    ["cong ty a chau", "Công ty Á Châu"],
  ])("tìm %s trong %s không phân biệt dấu và chữ hoa", (query, value) => {
    expect(vietnameseSearchRegex(query).test(value)).toBe(true);
  });

  it("coi ký tự regex do người dùng nhập là chữ thông thường", () => {
    expect(vietnameseSearchRegex("a.*").test("abc")).toBe(false);
    expect(vietnameseSearchRegex("a.*").test("a.*")).toBe(true);
  });
});
