import { Router } from "express";

import rateLimit from "express-rate-limit";

import { createMedia, getMedia, getMediaById, getDeletedMedia, softDeleteMedia, restoreMedia, permanentlyDeleteMedia, updateMedia, uploadMediaContentImage } from "../../controllers/admin/media.controller";
import { requireCloudinaryConfig, uploadMediaCover, uploadTinyMceImage } from "../../helpers/multerCloudinary.helper";
import { requireAnyPermission, requireMediaCreatePermission, requireMediaUpdatePermission, requirePermissions } from "../../middlewares/auth.middleware";
import { validateMediaCreateUpload, validateMediaUpdateUpload } from "../../middlewares/media-upload.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware";
import { securityConfig } from "../../config/security.config";
import { mediaListQuerySchema, mediaTrashActionSchema } from "../../validates/admin/media.validate";

const router = Router();
const contentImageUploadLimiter = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  limit: securityConfig.mediaContentImageUploadRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (request) => `account:${request.admin!.id}`,
  message: { success: false, message: "Bạn đã tải lên quá nhiều hình ảnh, vui lòng thử lại sau." },
});

router.get("/", requirePermissions("media:view"), validateQuery(mediaListQuerySchema), getMedia);
router.get("/trash", requirePermissions("media:trash"), validateQuery(mediaListQuerySchema), getDeletedMedia);
router.post("/content-images", requireAnyPermission("media:create", "media:update"), contentImageUploadLimiter, requireCloudinaryConfig, uploadTinyMceImage.single("image"), uploadMediaContentImage);
router.get("/:id", requirePermissions("media:view"), getMediaById);
router.post("/", requirePermissions("media:create"), uploadMediaCover.single("coverImage"), validateMediaCreateUpload, requireMediaCreatePermission, createMedia);
router.patch("/:id", requireAnyPermission("media:update", "media:publish"), uploadMediaCover.single("coverImage"), validateMediaUpdateUpload, requireMediaUpdatePermission, updateMedia);
router.delete("/:id", requirePermissions("media:delete"), softDeleteMedia);
router.post("/:id/restore", requirePermissions("media:trash"), validateBody(mediaTrashActionSchema), restoreMedia);
router.delete("/:id/permanent", requirePermissions("media:trash"), permanentlyDeleteMedia);

export default router;
