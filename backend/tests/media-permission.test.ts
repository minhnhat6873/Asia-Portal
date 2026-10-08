import type { NextFunction, Request, Response } from "express";

import { requireMediaUpdatePermission } from "../src/middlewares/auth.middleware";

function requestMock(permissions: string[], body: Record<string, unknown>) {
  return { body, admin: { id: "1", name: "Admin", email: "admin@asiafnb.com", role: "manager", permissions } } as unknown as Request;
}

function responseMock() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

describe("media update permissions", () => {
  it("yêu cầu quyền publish khi body có status", () => {
    const next = jest.fn() as NextFunction;
    requireMediaUpdatePermission(requestMock(["media:publish"], { status: "draft" }), responseMock(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("yêu cầu quyền update khi không đổi status", () => {
    const next = jest.fn() as NextFunction;
    requireMediaUpdatePermission(requestMock(["media:update"], { title: "Tiêu đề mới" }), responseMock(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

