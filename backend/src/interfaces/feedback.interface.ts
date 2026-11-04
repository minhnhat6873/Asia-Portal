import type { AuditActor } from "./audit-log.interface";
export interface Feedback { title: string; content: string; contentText: string; isAnonymous: boolean; senderName: string | null; senderEmail: string | null; status: "pending" | "seen"; pinned: boolean; isDeleted: boolean; deletedAt: Date | null; deletedBy?: AuditActor; createdAt: Date; updatedAt: Date }
export interface FeedbackInput { title: string; content: string; isAnonymous: boolean; senderName?: string; senderEmail?: string }
export interface FeedbackQuery { page?: string; limit?: string; q?: string; status?: "all" | "pending" | "seen" }
export type FeedbackPatch = Partial<Pick<Feedback, "status" | "pinned">>;
