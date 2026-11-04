import type { Request, Response, NextFunction } from "express";
import { userFeedbackService } from "../../services/user/feedback.service";
export async function createFeedback(req: Request, res: Response, next: NextFunction) { try { await userFeedbackService.create(req.body); res.status(201).json({ success: true, message: "Đã gửi đóng góp ý kiến." }); } catch (error) { next(error); } }
