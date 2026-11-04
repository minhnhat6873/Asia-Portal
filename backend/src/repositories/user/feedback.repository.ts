import FeedbackModel from "../../models/feedback.model";
import type { FeedbackInput } from "../../interfaces/feedback.interface";
export const userFeedbackRepository = { create(data: Omit<FeedbackInput, "senderName" | "senderEmail"> & { contentText: string; senderName: string | null; senderEmail: string | null }) { return FeedbackModel.create(data); } };
