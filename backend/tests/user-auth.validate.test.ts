import { userRegisterSchema, userEmailOnlySchema, userResetSchema, userLoginSchema } from "../src/validates/user/auth.validate";

const valid = { name: "Nguyễn Minh An", email: "TEST@asiafnb.com", phone: "+84 901 234 567", password: "Aa1!bbbb", confirmPassword: "Aa1!bbbb" };
it("normalizes contacts and strips privilege injection and password confirmation", () => {
  const result = userRegisterSchema.validate({ ...valid, role: "admin", status: "active", authVersion: 99 }, { stripUnknown: true });
  expect(result.error).toBeUndefined();
  expect(result.value).toMatchObject({ email: "test@asiafnb.com", phone: "0901234567" });
  for (const field of ["role", "status", "authVersion", "confirmPassword"]) expect(result.value).not.toHaveProperty(field);
});
it.each(["abc", "a@gmail.com", "a@asiafnb.com.evil.test", "a..b@asiafnb.com", ".a@asiafnb.com", "a@asiafnb.vn", { $ne: null }])("rejects invalid emails without disclosing the allowed domain: %j", email => {
  const result = userEmailOnlySchema.validate({ email });
  expect(result.error).toBeDefined();
  expect(result.error!.message).not.toMatch(/asiafnb|pattern|gmail|evil/);
});
it.each(["Aa1!bbb", "Aa1!" + "b".repeat(29), "aa1!bbbb", "AA1!BBBB", "Aa!!bbbb", "Aa11bbbb", "Aa1! bbb", "Aa1!\tbbb", "Aa1!ébbb"])("rejects weak/oversized/whitespace passwords: %j", password => {
  expect(userRegisterSchema.validate({ ...valid, password, confirmPassword: password }).error).toBeDefined();
  expect(userResetSchema.validate({ email: valid.email, code: "123456", password, confirmPassword: password }).error).toBeDefined();
});
it.each(["Aa1!bbbb", "Aa1!" + "b".repeat(28)])("accepts the password boundaries", password => {
  expect(userRegisterSchema.validate({ ...valid, password, confirmPassword: password }).error).toBeUndefined();
});
it.each(["0123456789", "090123456", "09012345678", "123", "+1 901234567"])("rejects invalid Vietnamese mobile: %s", phone => {
  expect(userRegisterSchema.validate({ ...valid, phone }).error).toBeDefined();
});
it("rejects mismatching confirmation and malformed OTP", () => {
  expect(userRegisterSchema.validate({ ...valid, confirmPassword: "aa1!bbbb" }).error).toBeDefined();
  expect(userResetSchema.validate({ ...valid, code: "12345x" }).error).toBeDefined();
});
it("reports a malformed email as a format error and a non-company email only as invalid", () => {
  expect(userEmailOnlySchema.validate({ email: "abc" }).error!.message).toBe("Email không đúng định dạng.");
  expect(userEmailOnlySchema.validate({ email: "a@gmail.com" }).error!.message).toBe("Email không hợp lệ.");
  expect(userRegisterSchema.validate({ ...valid, email: "a@gmail.com" }).error!.message).toBe("Email không hợp lệ.");
});
it("login checks only that credentials are present, without the domain or password policy", () => {
  for (const email of ["a@gmail.com", "TEST@asiafnb.com"]) {
    const result = userLoginSchema.validate({ email, password: "abc" });
    expect(result.error).toBeUndefined();
    expect(result.value.email).toBe(email.toLowerCase());
  }
  expect(userLoginSchema.validate({ email: valid.email, password: " Aa1!bbbb" }).value.password).toBe(" Aa1!bbbb");
  expect(userLoginSchema.validate({ email: "abc", password: "x" }).error!.message).toBe("Email không đúng định dạng.");
  expect(userLoginSchema.validate({ email: valid.email, password: "" }).error!.message).toBe("Vui lòng nhập mật khẩu.");
  expect(userLoginSchema.validate({ email: valid.email }).error!.message).toBe("Vui lòng nhập mật khẩu.");
  const oversized = userLoginSchema.validate({ email: valid.email, password: "a".repeat(129) }).error!.message;
  expect(oversized).toBe("Email hoặc mật khẩu không chính xác.");
  expect(oversized).not.toMatch(/ký tự|chữ hoa|asiafnb/);
});
