import { sanitizeRichText } from "../src/utils/html/sanitizeRichText";

describe("sanitize rich text", () => {
  it("loại script và event handler", () => {
    const result = sanitizeRichText('<p><img src=x onerror="alert(1)">An toàn</p><script>alert(1)</script>');
    expect(result).not.toContain("script");
    expect(result).not.toContain("onerror");
    expect(result).toContain("An toàn");
  });

  it("loại javascript URL và ép thuộc tính link an toàn", () => {
    const result = sanitizeRichText('<a href="javascript:alert(1)">Link</a>');
    expect(result).not.toContain("javascript:");
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });
});

