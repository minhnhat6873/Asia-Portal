import type { NextFunction, Request, Response } from "express";

import { requireMediaUpdatePermission, requireMediaCreatePermission } from "../src/middlewares/auth.middleware";

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



describe("prevent publishing and content permission bypasses", () => {
  it.each([
    [["media:publish"], {status:"published", title:"Changed"}, false],
    [["media:update"], {status:"draft", title:"Changed"}, false],
    [["media:update","media:publish"], {status:"draft", title:"Changed"}, true],
    [["media:update"], {expiryDate:"2026-10-20", publishIndefinitely:true}, true],
  ])("checks all required permissions: %j %j", (permissions, body, allowed) => {
    const response = responseMock(); const next = jest.fn();
    requireMediaUpdatePermission(requestMock(permissions as string[], body as Record<string, unknown>), response, next);
    expect(next).toHaveBeenCalledTimes(allowed ? 1 : 0);
    if (!allowed) expect(response.status).toHaveBeenCalledWith(403);
  });
  it("requires publish permission to create an already published article", () => {
    const response = responseMock(); const next = jest.fn();
    requireMediaCreatePermission(requestMock(["media:create"], {status:"published"}), response, next);
    expect(response.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled();
  });
  it("allows creating drafts without publish permission", () => {
    const next = jest.fn();
    requireMediaCreatePermission(requestMock(["media:create"], {status:"draft"}), responseMock(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
