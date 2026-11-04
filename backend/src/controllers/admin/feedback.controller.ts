import type { Request, Response, NextFunction } from "express";
import type { FeedbackQuery } from "../../interfaces/feedback.interface";
import type { AuditAction } from "../../interfaces/audit-log.interface";
import { adminFeedbackService as service } from "../../services/admin/feedback.service";
import { auditLogService } from "../../services/admin/audit-log.service";
async function audit(req: Request, action: AuditAction, metadata?: Record<string, unknown>) { const a = req.admin!; await auditLogService.record({ actor: { accountId: a.id, name: a.name, email: a.email }, action, entityType: "feedback", entityId: String(req.params.id), description: "Quản lý đóng góp ý kiến", metadata }); }
export async function list(req: Request<unknown, unknown, unknown, FeedbackQuery>, res: Response, next: NextFunction) { try { res.json({ success: true, data: await service.list(req.query) }); } catch (e) { next(e); } }
export async function detail(req: Request<{ id: string }>, res: Response, next: NextFunction) { try { const result = await service.detail(req.params.id); if (result.changed) await audit(req, "feedback.updated", { status: "seen" }); res.json({ success: true, data: result.item }); } catch (e) { next(e); } }
export async function update(req: Request<{ id: string }>, res: Response, next: NextFunction) { try { const item = await service.update(req.params.id, req.body); await audit(req, "feedback.updated", req.body.pinned === true ? { ...req.body, status: item.status } : req.body); res.json({ success: true, data: item }); } catch (e) { next(e); } }
export async function remove(req: Request<{ id: string }>, res: Response, next: NextFunction) { try { await service.remove(req.params.id); await audit(req, "feedback.deleted", { permanentlyDeleted: true }); res.json({ success: true, message: "Đã xóa vĩnh viễn đóng góp." }); } catch (e) { next(e); } }
