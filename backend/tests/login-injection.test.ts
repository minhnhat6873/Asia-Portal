import mongoSanitize from "express-mongo-sanitize";
import { userLoginSchema } from "../src/validates/user/auth.validate";
import { loginSchema } from "../src/validates/admin/auth.validate";

// NoSQL injection: sending an object such as {"$ne": null} instead of a string, hoping the
// database query matches any account. Login must reject it before any query runs.
const attacks: unknown[] = [{ $ne: null }, { $gt: "" }, { $regex: ".*" }, ["a@asiafnb.com"], { username: "a@asiafnb.com" }, 123, true];

describe.each([["user login", userLoginSchema], ["admin login", loginSchema]])("%s", (_label, schema) => {
  it.each(attacks)("rejects a non-string username: %j", (username) => {
    expect(schema.validate({ username, password: "Aa1!bbbb" }).error).toBeDefined();
  });
  it.each(attacks)("rejects a non-string password: %j", (password) => {
    expect(schema.validate({ username: "a@asiafnb.com", password }).error).toBeDefined();
  });
  it("keeps a password that looks like an operator as plain text", () => {
    const { error, value } = schema.validate({ username: "a@asiafnb.com", password: "{\"$ne\":null}" });
    expect(error).toBeUndefined();
    expect(value.password).toBe("{\"$ne\":null}");
  });
});

it("strips $-operators from request bodies before validation runs (index.ts)", () => {
  const body = { email: { $ne: null }, password: { $gt: "" }, nested: { "a.b": 1 } };
  mongoSanitize.sanitize(body);
  expect(body).toEqual({ email: {}, password: {}, nested: {} });
});
