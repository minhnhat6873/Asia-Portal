import assert from "node:assert/strict";
import test from "node:test";
import { loadValidation } from "./load-validation.mjs";

const { getPasswordValidationError } = await loadValidation(new URL("../src/lib/password-validation.ts", import.meta.url));
const register = await loadValidation(new URL("../src/features/admin/register/register.validation.ts", import.meta.url));
const account = await loadValidation(new URL("../src/features/access-control/create-account.validation.ts", import.meta.url));

const invalid = ["", "Aa1!bbb", "Aa1!" + "b".repeat(29), " Aa1!bbbb", "Aa1!bbbb ", "Aa1! bbbb", "Aa1!\tbbbb", "Aa1!\nbbbb", "Aa1!\u00a0bbbb", "aa1!bbbb", "AA1!BBBB", "Aa!!bbbb", "Aa11bbbb", "        "];
invalid.push("Aa1!" + "漢".repeat(23) + "X", "Aa1!" + "漢".repeat(23) + "Y");
for (const password of invalid) {
  test(`new password rejected consistently: ${JSON.stringify(password)}`, () => {
    const error = getPasswordValidationError(password);
    assert.ok(error);
    assert.equal(register.getPasswordValidationError(password), error);
    assert.equal(account.validateAccountPassword(password, password).password, error);
  });
}
test("accepts exactly 8 and 32 characters with all required character groups", () => {
  for (const password of ["Aa1!bbbb", "Aa1!" + "b".repeat(28)]) {
    assert.equal(getPasswordValidationError(password), undefined);
    assert.deepEqual(account.validateAccountPassword(password, password), {});
    assert.equal(register.getPasswordValidationError(password), undefined);
  }
});
test("does not silently trim spaces and preserves case-sensitive confirmation", () => {
  assert.match(getPasswordValidationError(" Aa1!bbbb"), /khoảng trắng/);
  assert.ok(account.validateAccountPassword("Aa1!bbbb", "aa1!bbbb").confirmPassword);
});
test("accepts Unicode at 71/72 UTF-8 bytes but rejects 73 bytes without trimming or normalization", () => {
  const prefix = "Aa1!" + "漢".repeat(22);
  for (const suffix of ["a", "ab"]) {
    const password = prefix + suffix;
    assert.equal(getPasswordValidationError(password), undefined);
    assert.equal(account.validateAccountPassword(password, password).password, undefined);
  }
  assert.match(getPasswordValidationError(prefix + "abc"), /Unicode/);
});
