import type { Request, Response } from "express";
import { createAccountSchema } from "../src/validates/admin/account.validate";
import { validateBody } from "../src/middlewares/validate.middleware";

const valid = {
  name: "Nguyễn Hoàng Minh Nhật", email: "nhat@asiafnb.com", phone: "0901234567",
  password: "Password123!", confirmPassword: "Password123!", role: "manager",
};

describe("admin account creation validation", () => {
  it("normalizes company email, name and phone, and strips confirmation before persistence", () => {
    const { error, value } = createAccountSchema.validate({
      ...valid, name: " Nguyễn Hoàng Minh Nhật ", email: " NHAT@ASIAFNB.COM ", phone: "+84 901-234-567",
    });
    expect(error).toBeUndefined();
    expect(value).toMatchObject({ name: valid.name, email: valid.email, phone: valid.phone, password: valid.password });
    expect(value).not.toHaveProperty("confirmPassword");
  });

  it.each(["0312345678", "0512345678", "0712345678", "0812345678", "0912345678", "+84901234567", "090.123.4567"])("accepts Vietnamese mobile numbers: %s", (phone) => {
    expect(createAccountSchema.validate({ ...valid, phone }).error).toBeUndefined();
  });

  it.each([
    ["email", "nhat@gmail.com"], ["email", "nhat@asiafnb.com.evil.com"],
    ["email", "nhat@sub.asiafnb.com"], ["email", "nhat@@asiafnb.com"],
    ["email", "nhat..test@asiafnb.com"], ["email", "@asiafnb.com"],
    ["phone", "12365445"], ["phone", "0123456789"], ["phone", "09012345678"],
    ["phone", "+1901234567"], ["phone", "090abc4567"], ["phone", ""],
    ["name", "123456"], ["name", "N"], ["name", ""],
    ["password", "short"], ["password", "        "],
    ["confirmPassword", "Different123!"], ["confirmPassword", ""],
  ])("rejects invalid %s: %s", (field, value) => {
    const result = createAccountSchema.validate({ ...valid, [field]: value }, { abortEarly: false });
    expect(result.error?.details.some((detail) => detail.path[0] === field)).toBe(true);
  });

  it.each(["name", "email", "phone", "password", "confirmPassword"])("requires %s even when calling the API directly", (field) => {
    const body: Record<string, unknown> = { ...valid };
    delete body[field];
    const response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    const next = jest.fn();
    validateBody(createAccountSchema)({ body } as Request, response as unknown as Response, next);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("passes only validated fields into the controller", () => {
    const request = { body: { ...valid, isAdmin: true } } as Request;
    const next = jest.fn();
    validateBody(createAccountSchema)(request, {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(request.body).not.toHaveProperty("confirmPassword");
    expect(request.body).not.toHaveProperty("isAdmin");
  });
});
