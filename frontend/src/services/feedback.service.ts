import { apiPost } from "./api";
export interface FeedbackInput { title: string; content: string; isAnonymous: boolean; senderName?: string; senderEmail?: string }
export function submitFeedback(input: FeedbackInput) { return apiPost<void>("/user/feedback", input); }
