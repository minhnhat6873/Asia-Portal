import { model, models, Schema } from "mongoose";
import type { Feedback } from "../interfaces/feedback.interface";
const schema = new Schema<Feedback>({
 title: { type: String, required: true, trim: true, maxlength: 150 }, content: { type: String, required: true }, contentText: { type: String, required: true },
 isAnonymous: { type: Boolean, required: true }, senderName: { type: String, default: null }, senderEmail: { type: String, lowercase: true, default: null },
 status: { type: String, enum: ["pending", "seen"], default: "pending" }, pinned: { type: Boolean, default: false }, isDeleted: { type: Boolean, default: false }, deletedAt: { type: Date, default: null },
 deletedBy: { accountId: String, name: String, email: String, _id: false },
}, { timestamps: true, versionKey: false });
schema.index({ isDeleted: 1, pinned: -1, createdAt: -1 });
schema.index({ status: 1 });
schema.index({ title: "text", contentText: "text", senderName: "text", senderEmail: "text" });
export default models.Feedback || model<Feedback>("Feedback", schema);
