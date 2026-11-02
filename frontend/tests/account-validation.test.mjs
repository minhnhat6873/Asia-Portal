import assert from "node:assert/strict";
import test from "node:test";
import { loadValidation } from "./load-validation.mjs";
const { normalizeAccountPhone, validateAccountIdentity, validateAccountPassword, validateCreateAccount } = await loadValidation(new URL("../src/features/access-control/create-account.validation.ts", import.meta.url));

const identity = { name: "Nguyễn Văn An", email: "an@asiafnb.com", phone: "0901234567" };

test("create and edit share valid company contact rules", () => {
  for (const phone of ["0901234567", "+84901234567", " +84 901-234-567 ", "090.123.4567"]) {
    assert.deepEqual(validateAccountIdentity({ ...identity, phone, email: " AN@ASIAFNB.COM " }), {});
    assert.equal(normalizeAccountPhone(phone), identity.phone);
  }
});

test("email rejects other domains, consecutive dots, oversized local part and empty values", () => {
  for (const email of ["", "an@gmail.com", "an@asiafnb.com.evil.com", "an..test@asiafnb.com", `${"a".repeat(65)}@asiafnb.com`]) {
    assert.ok(validateAccountIdentity({ ...identity, email }).email, email);
  }
});

test("phone rejects missing numbers, wrong prefixes, letters and wrong length", () => {
  for (const phone of ["", "0123456789", "090123456", "09012345678", "090abc4567", "+1901234567"]) {
    assert.ok(validateAccountIdentity({ ...identity, phone }).phone, phone);
  }
});

test("name accepts Vietnamese names and rejects numeric names", () => {
  assert.equal(validateAccountIdentity(identity).name, undefined);
  for (const name of ["", "A", "123456", "An <script>"]) assert.ok(validateAccountIdentity({ ...identity, name }).name);
});

test("password requires 8-32 characters and rejects whitespace", () => {
  for (const password of ["", "short", "        ", "a".repeat(101)]) assert.ok(validateAccountPassword(password, password).password);
  assert.deepEqual(validateAccountPassword("Password123!", "Password123!"), {});
});

test("confirmation is required, case sensitive and updated when password changes", () => {
  assert.ok(validateAccountPassword("Password123!", "").confirmPassword);
  assert.ok(validateAccountPassword("Password123!", "password123!").confirmPassword);
  assert.ok(validateAccountPassword("NewPassword123!", "Password123!").confirmPassword);
});

test("create account still combines identity and password validation", () => {
  assert.deepEqual(validateCreateAccount({ ...identity, password: "Password123!", confirmPassword: "Password123!" }), {});
  const errors = validateCreateAccount({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  assert.deepEqual(Object.keys(errors).sort(), ["confirmPassword", "email", "name", "password", "phone"]);
});
