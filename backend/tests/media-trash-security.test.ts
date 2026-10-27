import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import routes from "../src/routes/index.route";
import { globalErrorHandler } from "../src/middlewares/error.middleware";
import { adminAccountRepository } from "../src/repositories/admin/account.repository";
import { permissionGroupRepository } from "../src/repositories/admin/permission-group.repository";
import { adminMediaService } from "../src/services/admin/media.service";
import { auditLogService } from "../src/services/admin/audit-log.service";
import { AUTH_COOKIE_NAME } from "../src/config/auth.config";
import { adminMediaRepository } from "../src/repositories/admin/media.repository";
import { userMediaRepository } from "../src/repositories/user/media.repository";
import { createMediaSchema, updateMediaSchema } from "../src/validates/admin/media.validate";

const id = "507f1f77bcf86cd799439011";
const actorId = "507f1f77bcf86cd799439012";
const post = { _id: id, title: "Private trashed article", status: "draft", isDeleted: true };
let server: Server;
let url: string;
let token: string;
let permissions: string[];
const oldSecret = process.env.JWT_SECRET;

beforeAll(async () => {
  process.env.JWT_SECRET = "qa-media-trash-secret-for-tests-only";
  token = jwt.sign({ sub: actorId, tokenType: "access" }, process.env.JWT_SECRET);
  const app = express();
  app.use(express.json(), cookieParser(), routes, globalErrorHandler);
  await new Promise<void>((resolve, reject) => { server = app.listen(0, "127.0.0.1", (error) => error ? reject(error) : resolve()); });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin/media`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (oldSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = oldSecret;
});

beforeEach(() => {
  permissions = [];
  jest.spyOn(adminAccountRepository, "findActiveById").mockResolvedValue({ _id: actorId, name: "QA Manager", email: "qa@asiafnb.com", role: "manager", status: "active", permissionGroupIds: [] } as never);
  jest.spyOn(permissionGroupRepository, "findActiveByIds").mockImplementation(() => Promise.resolve([{ actions: permissions }]) as never);
  jest.spyOn(adminMediaService, "getMedia").mockResolvedValue({ items: [post], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } as never);
  jest.spyOn(adminMediaService, "softDeleteMedia").mockResolvedValue(post as never);
  jest.spyOn(adminMediaService, "restoreMedia").mockResolvedValue({ ...post, isDeleted: false } as never);
  jest.spyOn(adminMediaService, "permanentlyDeleteMedia").mockResolvedValue(post as never);
  jest.spyOn(adminMediaService, "cleanupCover").mockResolvedValue(undefined);
  jest.spyOn(auditLogService, "record").mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

function call(path: string, method = "GET", body?: unknown, authenticated = true) {
  return fetch(url + path, { method, headers: { ...(authenticated ? { Cookie: `${AUTH_COOKIE_NAME}=${token}` } : {}), "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

describe("media trash API access control", () => {
  it.each([["/trash", "GET"], [`/${id}/restore`, "POST"], [`/${id}/permanent`, "DELETE"], [`/${id}`, "DELETE"]])("rejects anonymous requests %s %s", async (path, method) => {
    expect((await call(path!, method!, undefined, false)).status).toBe(401);
    expect(adminMediaService.getMedia).not.toHaveBeenCalled();
    expect(adminMediaService.restoreMedia).not.toHaveBeenCalled();
  });

  it.each(["media:view", "media:delete", "media:update", "media:publish"])("%s cannot list, restore or permanently delete trash", async (permission) => {
    permissions = [permission];
    for (const [path, method] of [["/trash", "GET"], [`/${id}/restore`, "POST"], [`/${id}/permanent`, "DELETE"]]) expect((await call(path!, method!)).status).toBe(403);
    expect(adminMediaService.getMedia).not.toHaveBeenCalled();
    expect(adminMediaService.restoreMedia).not.toHaveBeenCalled();
    expect(adminMediaService.permanentlyDeleteMedia).not.toHaveBeenCalled();
  });

  it("trash permission is independent, and restore cannot publish", async () => {
    permissions = ["media:trash"];
    expect((await call("/trash")).status).toBe(200);
    expect(adminMediaService.getMedia).toHaveBeenCalledWith(expect.anything(), true);
    const restored = await call(`/${id}/restore`, "POST", {});
    expect(restored.status).toBe(200);
    expect((await restored.json()).data).toMatchObject({ status: "draft", isDeleted: false });
    expect((await call(`/${id}/permanent`, "DELETE")).status).toBe(200);
    expect((await call(`/${id}`, "DELETE")).status).toBe(403);
    expect((await call(`/${id}`, "PATCH", { status: "published" })).status).toBe(403);
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "media.restored", actor: expect.objectContaining({ accountId: actorId }) }));
  });

  it("soft-delete uses the authenticated actor and never calls permanent deletion", async () => {
    permissions = ["media:delete"];
    expect((await call(`/${id}`, "DELETE", { deletedBy: { accountId: "forged" } })).status).toBe(200);
    expect(adminMediaService.softDeleteMedia).toHaveBeenCalledWith(id, { accountId: actorId, name: "QA Manager", email: "qa@asiafnb.com" });
    expect(adminMediaService.permanentlyDeleteMedia).not.toHaveBeenCalled();
    expect(adminMediaService.cleanupCover).not.toHaveBeenCalled();
  });

  it("publish-only accounts cannot enter the cover upload pipeline", async () => {
    permissions = ["media:publish"];
    const form = new FormData();
    form.append("coverImage", new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }), "qa.png");
    const update = jest.spyOn(adminMediaService, "updateMedia");
    const response = await fetch(`${url}/${id}`, { method: "PATCH", headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` }, body: form });
    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("blocks restore mass assignment and query injection", async () => {
    permissions = ["media:trash"];
    expect((await call(`/${id}/restore`, "POST", { status: "published", isDeleted: false, coverImagePublicId: "victim" })).status).toBe(400);
    expect(adminMediaService.restoreMedia).not.toHaveBeenCalled();
    expect((await call("/trash?isDeleted=false")).status).toBe(400);
    expect((await call("/trash?search%5B%24ne%5D=x")).status).toBe(400);
  });

  it("permission removal and account lock are checked on the next request", async () => {
    permissions = ["media:trash"];
    expect((await call("/trash")).status).toBe(200);
    permissions = [];
    expect((await call("/trash")).status).toBe(403);
    jest.mocked(adminAccountRepository.findActiveById).mockResolvedValue(null);
    expect((await call("/trash")).status).toBe(401);
  });
});

describe("media trash database boundaries", () => {
  it("uses atomic, mutually exclusive state predicates for restore/delete", () => {
    const restore = adminMediaRepository.restoreById(id);
    expect(restore.getFilter()).toEqual({ _id: id, isDeleted: true });
    expect(restore.getUpdate()).toMatchObject({ $set: { isDeleted: false, status: "draft", deletedAt: null }, $unset: { deletedBy: "" } });
    expect(adminMediaRepository.permanentlyDeleteById(id).getFilter()).toEqual({ _id: id, isDeleted: true });
    expect(adminMediaRepository.softDeleteById(id, { accountId: actorId, name: "QA", email: "qa@asiafnb.com" }).getFilter()).toEqual({ _id: id, isDeleted: { $ne: true } });
    expect(adminMediaRepository.updateById(id, { status: "published" }).getFilter()).toMatchObject({ isDeleted: { $ne: true } });
  });

  it("excludes trash and deletion metadata from public reads, including direct URLs", () => {
    for (const query of [userMediaRepository.findAll({ filter: {}, skip: 0, limit: 10, sort: { publishDate: -1 } }), userMediaRepository.findById(id), userMediaRepository.count({})]) {
      expect(query.getFilter()).toMatchObject({ $and: [expect.any(Object), expect.objectContaining({ isDeleted: { $ne: true } })] });
    }
    expect(userMediaRepository.findById(id).projection()).toMatchObject({ deletedBy: 0, deletedAt: 0, isDeleted: 0, coverImagePublicId: 0 });
  });

  it("keeps image references for posts in trash", () => {
    expect(adminMediaRepository.hasContentAssetReference("asset-id").getFilter()).not.toHaveProperty("isDeleted");
    expect(adminMediaRepository.hasCoverReference("asset-id").getFilter()).not.toHaveProperty("isDeleted");
  });

  it("cannot change deletion metadata through the normal edit schema", () => {
    const result = updateMediaSchema.validate({ title: "Valid new title", isDeleted: false, deletedBy: { accountId: "forged" }, coverImagePublicId: "victim" }, { stripUnknown: true });
    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({ title: "Valid new title" });
    const created = createMediaSchema.validate({ title: "Valid new title", summary: "Summary", category: "Tin tức", authorDepartment: "Phòng Thiết kế", publishDate: "2026-10-26", publishIndefinitely: true, isDeleted: false }, { stripUnknown: true });
    expect(created.error).toBeUndefined();
    expect(created.value).not.toHaveProperty("isDeleted");
  });
});
