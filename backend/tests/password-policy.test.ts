import { createAccountSchema, resetPasswordSchema } from "../src/validates/admin/account.validate";
import { loginSchema, registerAccountSchema, requestPasswordChangeOtpSchema, resetPasswordWithOtpSchema } from "../src/validates/admin/auth.validate";
import { newPasswordSchema } from "../src/validates/admin/password.validate";
import bcrypt from "bcryptjs";

const name = "Nguyễn Văn An", email = "an@asiafnb.com", phone = "0901234567";
const contexts = [
  { label: "register", schema: registerAccountSchema, data: { name, email, phone, termsAccepted: true }, field: "password", confirm: true },
  { label: "admin create", schema: createAccountSchema, data: { name, email, phone, role: "user" }, field: "password", confirm: true },
  { label: "admin reset", schema: resetPasswordSchema, data: {}, field: "password", confirm: true },
  { label: "forgot password", schema: resetPasswordWithOtpSchema, data: { email, code: "123456" }, field: "password", confirm: true },
  { label: "self change", schema: requestPasswordChangeOtpSchema, data: { currentPassword: "Old Password123!" }, field: "newPassword", confirm: false },
];
const invalid = ["", "Aa1!bbb", "Aa1!" + "b".repeat(29), " Aa1!bbbb", "Aa1!bbbb ", "Aa1! bbbb", "Aa1!\tbbbb", "Aa1!\nbbbb", "Aa1!\u00a0bbbb", "aa1!bbbb", "AA1!BBBB", "Aa!!bbbb", "Aa11bbbb", "        "];
invalid.push("Aa1!" + "漢".repeat(23) + "X", "Aa1!" + "漢".repeat(23) + "Y");

describe.each(contexts)("$label password policy", ({ schema, data, field, confirm }) => {
  it.each(invalid)("rejects invalid password %j at the API boundary", (password) => {
    const result = schema.validate({ ...data, [field]: password, ...(confirm ? { confirmPassword: password } : {}) }, { abortEarly: false });
    expect(result.error?.details.some((error) => error.path[0] === field)).toBe(true);
  });
  it.each(["Aa1!bbbb", "Aa1!" + "b".repeat(28)])("accepts a valid boundary password %j unchanged", (password) => {
    const result = schema.validate({ ...data, [field]: password, ...(confirm ? { confirmPassword: password } : {}) });
    expect(result.error).toBeUndefined(); expect(result.value[field]).toBe(password);
  });
});
it("does not trim a forbidden space into an accepted password", () => {
  expect(newPasswordSchema.validate(" Aa1!bbbb").error?.message).toContain("khoảng trắng");
});
it.each(["Aa1!", "Old Password123!", "A".repeat(40)])("preserves existing credentials during login and self-change verification: %j", (password) => {
  const login = loginSchema.validate({ username: email, password });
  expect(login.error).toBeUndefined(); expect(login.value.password).toBe(password);
  const change = requestPasswordChangeOtpSchema.validate({ currentPassword: password, newPassword: "Aa1!bbbb" });
  expect(change.error).toBeUndefined(); expect(change.value.currentPassword).toBe(password);
});
it.each(["Mậtkhẩu1!", "Aa1!bbbé", "Aa1!" + "漢".repeat(4), "Aa1!bbb😀"])("rejects accents and other non-ASCII characters in new passwords: %j", (password) => {
  expect(newPasswordSchema.validate(password).error?.message).toBe("Mật khẩu chỉ được dùng ký tự không dấu.");
});
it("still accepts every printable ASCII symbol, and never reaches bcrypt's 72-byte limit", () => {
  expect(newPasswordSchema.validate("Aa1!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~").error?.message).toBe("Mật khẩu không được vượt quá 32 ký tự.");
  for (const password of ["Aa1!@#$%^&*()_+-=[]{}|;:,.<>?/~`", "Aa1!" + "b".repeat(28)]) {
    expect(newPasswordSchema.validate(password).error).toBeUndefined();
    expect(bcrypt.truncates(password)).toBe(false);
  }
});
it("keeps accepting existing accented passwords at sign-in", () => {
  expect(loginSchema.validate({ username: email, password: "Mậtkhẩu cũ1!" }).error).toBeUndefined();
});
