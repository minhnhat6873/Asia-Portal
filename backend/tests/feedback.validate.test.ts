import { createFeedbackSchema } from "../src/validates/user/feedback.validate";
const base = { title: "Ý kiến", content: "<p>Nội dung đầy đủ</p>", isAnonymous: false, senderName: "Nguyễn Văn A", senderEmail: "nguyen.a@asiafnb.com" };
const validate = (input: object) => createFeedbackSchema.validate(input, { abortEarly: false, stripUnknown: true });
describe("feedback validation", () => {
 it.each(["nguyen.van.a@asiafnb.com", "NGUYEN.A@AsiaFnB.com"])("chấp nhận %s", email => { const result = validate({ ...base, senderEmail: email }); expect(result.error).toBeUndefined(); expect(result.value.senderEmail).toBe(email.toLowerCase()); });
 it.each(["abc@gmail.com", "abc@asiafnb.com.vn", "abc@sub.asiafnb.com", "abc@asiafnb.co", "@asiafnb.com", ".abc@asiafnb.com", "abc..x@asiafnb.com", "abc x@asiafnb.com"])("từ chối %s", email => { expect(validate({ ...base, senderEmail: email }).error).toBeDefined(); });
 it("xóa danh tính và trường không cho phép", () => { const result = validate({ ...base, isAnonymous: true, status: "seen", pinned: true }); expect(result.error).toBeUndefined(); expect(result.value).not.toHaveProperty("senderName"); expect(result.value).not.toHaveProperty("senderEmail"); expect(result.value).not.toHaveProperty("status"); expect(result.value).not.toHaveProperty("pinned"); });
 it("loại HTML nguy hiểm", () => { const result = validate({ ...base, content: '<p>Nội dung an toàn đủ dài</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">liên kết</a>' }); expect(result.error).toBeUndefined(); expect(result.value.content).not.toMatch(/script|img|onerror|javascript:/); });
 it.each(["<p></p>", "<p>ngắn</p>"])("từ chối n?i dung r?ng ho?c ngắn", content => { expect(validate({ ...base, content }).error).toBeDefined(); });
});
