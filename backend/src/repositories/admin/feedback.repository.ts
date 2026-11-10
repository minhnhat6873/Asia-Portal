import type { QueryFilter } from "mongoose";
import FeedbackModel from "../../models/feedback.model";
import type { Feedback, FeedbackPatch } from "../../interfaces/feedback.interface";
export const adminFeedbackRepository = {
 list(filter: QueryFilter<Feedback>, skip: number, limit: number) { return FeedbackModel.find(filter).sort({ pinned: -1, createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(); },
 count(filter: QueryFilter<Feedback>) { return FeedbackModel.countDocuments(filter); },
 find(id: string) { return FeedbackModel.findOne({ _id: id, isDeleted: false }).lean(); },
 markSeen(id: string) { return FeedbackModel.findOneAndUpdate({ _id: id, isDeleted: false, status: "pending" }, { status: "seen" }, { returnDocument: "after" }).lean(); },
 update(id: string, patch: FeedbackPatch) { return FeedbackModel.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: patch }, { returnDocument: "after", runValidators: true }).lean(); },
 remove(id: string) { return FeedbackModel.findOneAndDelete({ _id: id, isDeleted: false }).lean(); },
};
