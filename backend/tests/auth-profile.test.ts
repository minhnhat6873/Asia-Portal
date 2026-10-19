import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { requireAdminAuth } from "../src/middlewares/auth.middleware";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { AUTH_COOKIE_NAME } from "../src/config/auth.config";
import { getCurrentAccount } from "../src/controllers/admin/auth.controller";

describe("current account profile", () => {
  it.each(["admin", "manager"])("returns current DB phone/status for %s, excluding private storage fields", async (role) => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "profile-test-only-secret";
    const id = "507f1f77bcf86cd799439012";
    try {
      jest.spyOn(adminAccountRepository, "findActiveById").mockResolvedValue({
        _id: id, name: "Current name", email: "current@asiafnb.com", phone: "0901234567", status: "active", role,
        password: "private-hash", phoneKey: "private-index", permissionGroupIds: [],
      } as never);
      jest.spyOn(permissionGroupRepository, "findActiveByIds").mockResolvedValue([]);
      const token = jwt.sign({ tokenType: "access", phone: "old-phone", name: "Old name", status: "pending" }, process.env.JWT_SECRET, { subject: id });
      const request = { cookies: { [AUTH_COOKIE_NAME]: token } } as unknown as Request;
      const response = { status: jest.fn(), json: jest.fn() };
      response.status.mockReturnValue(response);
      const next = jest.fn();
      await requireAdminAuth(request, response as unknown as Response, next);
      expect(next).toHaveBeenCalledTimes(1);
      getCurrentAccount(request, response as unknown as Response);
      const data = response.json.mock.calls[0]![0].data;
      expect(data).toMatchObject({ id, name: "Current name", phone: "0901234567", status: "active", role });
      expect(data).not.toHaveProperty("phoneKey");
      expect(data).not.toHaveProperty("password");
    } finally {
      jest.restoreAllMocks();
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });
});
