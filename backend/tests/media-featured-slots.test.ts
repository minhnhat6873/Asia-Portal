import mongoose from "mongoose";
import MediaModel from "../src/models/media.model";
import { adminMediaRepository } from "../src/repositories/admin/media.repository";

function queryReturning(value: unknown) {
  const query = { sort: jest.fn(), select: jest.fn(), session: jest.fn(), lean: jest.fn().mockResolvedValue(value) };
  query.sort.mockReturnValue(query); query.select.mockReturnValue(query); query.session.mockReturnValue(query);
  return query;
}

afterEach(() => jest.restoreAllMocks());

it("giữ vị trí đã lưu và ánh xạ các bài cũ vào vị trí trống", async () => {
  const posts = [
    { _id: "a", title: "Bài A", featuredSlot: 3 },
    { _id: "b", title: "Bài B", featuredSlot: null },
    { _id: "c", title: "Bài C" },
  ];
  jest.spyOn(MediaModel, "find").mockReturnValue(queryReturning(posts) as never);
  await expect(adminMediaRepository.getFeaturedSlots()).resolves.toEqual([
    { id: "a", title: "Bài A", slot: 3 },
    { id: "b", title: "Bài B", slot: 1 },
    { id: "c", title: "Bài C", slot: 2 },
  ]);
});

it("từ chối vị trí đã có bài trong giao dịch mà không sửa bài nào", async () => {
  const session = { withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()), endSession: jest.fn() };
  jest.spyOn(mongoose, "startSession").mockResolvedValue(session as never);
  jest.spyOn(mongoose.connection, "collection").mockReturnValue({ updateOne: jest.fn().mockResolvedValue({}) } as never);
  jest.spyOn(MediaModel, "findOne").mockReturnValue(queryReturning(null) as never);
  jest.spyOn(MediaModel, "find").mockReturnValue(queryReturning([{ _id: "other", title: "Bài đang dùng", featuredSlot: 2 }]) as never);
  const update = jest.spyOn(MediaModel, "findOneAndUpdate");
  await expect(adminMediaRepository.activateFeaturedById("507f1f77bcf86cd799439011", { featured: true, featuredSlot: 2 })).rejects.toMatchObject({ statusCode: 409 });
  expect(update).not.toHaveBeenCalled();
  expect(session.endSession).toHaveBeenCalled();
});
