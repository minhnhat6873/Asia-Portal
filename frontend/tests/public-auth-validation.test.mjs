import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadValidation } from "./load-validation.mjs";

const { validate, initial, fieldErrorsFromApi } = await loadValidation(new URL("../src/features/public-auth/validation.ts", import.meta.url));
const check = (name, value, mode, values = initial) => validate(name, value, { ...values, [name]: value }, mode);

test("email: only the format is checked, any domain with a valid shape passes", () => {
  for (const email of ["ten@example.com", "a.b+c@sub.domain.vn", " Ten@Example.com "]) {
    for (const mode of ["login", "register", "forgot-password"]) assert.equal(check("email", email, mode), "");
  }
});

test("email: malformed addresses get a format message that names no domain", () => {
  for (const email of ["abc", "a@b", "a@@b.com", "a..b@x.com", ".a@x.com", "a.@x.com", "a@-x.com", "a b@x.com", `${"a".repeat(140)}@example.com`]) {
    const message = check("email", email, "register");
    assert.equal(message, "Email không đúng định dạng.");
  }
  assert.equal(check("email", "  ", "register"), "Vui lòng nhập địa chỉ email.");
});

test("login: the field is the username (any name, often the email); only presence is checked", () => {
  for (const username of ["Kun@4890", "abc", "ten@example.com"]) assert.equal(check("email", username, "login"), "");
  assert.equal(check("email", "  ", "login"), "Vui lòng nhập tên đăng nhập.");
});

test("user auth browser code never mentions the company domain", async () => {
  const files = [
    "../src/features/public-auth/validation.ts",
    "../src/features/public-auth/AuthField.tsx",
    "../src/features/public-auth/AuthForm.tsx",
    "../src/features/forgot-password/ForgotPasswordPage.tsx",
    "../src/features/reset-password/ResetPasswordPage.tsx",
    "../src/features/otp/OtpPage.tsx",
    "../src/services/user-auth.service.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /asiafnb/i, file);
  }
});

test("login: password is only required, the policy is not revealed", () => {
  assert.equal(check("password", "", "login"), "Vui lòng nhập mật khẩu.");
  for (const password of ["a", "abc", "khongdau", "Có dấu 1!"]) assert.equal(check("password", password, "login"), "");
});

test("register and reset: full password policy applies", () => {
  for (const password of ["Aa1!bbb", "aa1!bbbb", "AA1!BBBB", "Aa!!bbbb", "Aa11bbbb", "Aa1! bbb", "Aa1!ébbb", "Aa1!" + "b".repeat(29)]) {
    assert.notEqual(check("password", password, "register"), "", password);
  }
  for (const password of ["Aa1!bbbb", "Aa1!" + "b".repeat(28)]) assert.equal(check("password", password, "register"), "");
  assert.equal(check("password", "", "register"), "Vui lòng tạo mật khẩu.");
});

test("confirm password must match", () => {
  const values = { ...initial, password: "Aa1!bbbb" };
  assert.equal(validate("confirm", "Aa1!bbbb", { ...values, confirm: "Aa1!bbbb" }, "register"), "");
  assert.equal(validate("confirm", "Aa1!bbbc", { ...values, confirm: "Aa1!bbbc" }, "register"), "Hai mật khẩu chưa khớp.");
});

test("phone: Vietnamese mobile numbers only", () => {
  for (const phone of ["0901234567", "0321234567", "+84 901 234 567", "090.123.4567", "090-123-4567"]) assert.equal(check("phone", phone, "register"), "", phone);
  for (const phone of ["0123456789", "02838123456", "090123456", "09012345678", "+1 901234567", "abc"]) assert.notEqual(check("phone", phone, "register"), "", phone);
});

test("backend field errors map onto form fields", () => {
  assert.deepEqual(
    fieldErrorsFromApi({ email: "Email không hợp lệ.", confirmPassword: "Xác nhận mật khẩu không khớp.", role: "ignored" }),
    { email: "Email không hợp lệ.", confirm: "Xác nhận mật khẩu không khớp." },
  );
});
