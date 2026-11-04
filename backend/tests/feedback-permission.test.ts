import type { NextFunction, Request, Response } from "express";
import { requireAdminAuth, requireAdminRole } from "../src/middlewares/auth.middleware";
function responseMock() { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res as unknown as Response; }
it("ch?a ??ng nh?p nh?n 401", async () => { const res = responseMock(); const next = jest.fn() as NextFunction; await requireAdminAuth({ cookies: {} } as Request, res, next); expect(res.status).toHaveBeenCalledWith(401); });
it("manager nh?n 403", () => { const res = responseMock(); requireAdminRole("admin")({ admin: { role: "manager" } } as Request, res, jest.fn()); expect(res.status).toHaveBeenCalledWith(403); });
