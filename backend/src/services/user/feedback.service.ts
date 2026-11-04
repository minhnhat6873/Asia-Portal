import type { FeedbackInput } from "../../interfaces/feedback.interface";
import { userFeedbackRepository } from "../../repositories/user/feedback.repository";
import { sanitizeFeedback } from "../../utils/html/sanitizeFeedback";
import { richTextToPlainText } from "../../utils/html/sanitizeRichText";
export const userFeedbackService = { async create(input: FeedbackInput) { const content = sanitizeFeedback(input.content); await userFeedbackRepository.create({ title: input.title, content, contentText: richTextToPlainText(content), isAnonymous: input.isAnonymous, senderName: input.isAnonymous ? null : input.senderName ?? null, senderEmail: input.isAnonymous ? null : input.senderEmail ?? null }); } };
