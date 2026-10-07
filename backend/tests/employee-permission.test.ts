import type { NextFunction, Request, Response } from "express";

import { requireEmployeeUpdatePermission, requirePermissions } from "../src/middlewares/auth.middleware";

function responseMock() {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

function requestMock(permissions: string[], body: Record<string, unknown> = {}) {
  return {
    body,
    admin: {
      id: "507f1f77bcf86cd799439011",
      name: "Admin",
      email: "admin@asiafnb.com",
      role: "manager",
      permissions,
    },
  } as unknown as Request;
}

describe("employee permissions", () => {
  it("cho phép khi tài khoản có quyền được yêu cầu", () => {
    const next = jest.fn() as NextFunction;
    requirePermissions("employees:delete")(
      requestMock(["employees:delete"]),
      responseMock(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("trả 403 khi tài khoản thiếu quyền", () => {
    const response = responseMock();
    const next = jest.fn() as NextFunction;
    requirePermissions("employees:delete")(requestMock([]), response, next);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("yêu cầu quyền deactivate khi chuyển nhân viên sang inactive", () => {
    const next = jest.fn() as NextFunction;
    requireEmployeeUpdatePermission(
      requestMock(["employees:deactivate"], { status: "inactive" }),
      responseMock(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
