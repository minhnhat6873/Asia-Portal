import type { Request, Response, NextFunction } from "express";
import { userFeedbackService } from "../../services/user/feedback.service";
// Runs after requireUserAuth: a named feedback always carries the account's own name and email.
export async function createFeedback(req: Request, res: Response, next: NextFunction) { try { await userFeedbackService.create({ ...req.body, senderName: req.user!.name, senderEmail: req.user!.email }); res.status(201).json({ success: true, message: "Đã gửi đóng góp ý kiến." }); } catch (error) { next(error); } }
