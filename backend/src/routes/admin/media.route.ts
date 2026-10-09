import { Router } from "express";

import rateLimit from "express-rate-limit";

import { createMedia, getMedia, getMediaById, permanentlyDeleteMedia, updateMedia, uploadMediaContentImage } from "../../controllers/admin/media.controller";
import { requireCloudinaryConfig, uploadMediaCover, uploadTinyMceImage } from "../../helpers/multerCloudinary.helper";
import { requireMediaUpdatePermission, requirePermissions } from "../../middlewares/auth.middleware";
import { validateMediaCreateUpload, validateMediaUpdateUpload } from "../../middlewares/media-upload.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { securityConfig } from "../../config/security.config";
import { mediaListQuerySchema } from "../../validates/admin/media.validate";

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
router.post("/content-images", requirePermissions("media:create"), contentImageUploadLimiter, requireCloudinaryConfig, uploadTinyMceImage.single("image"), uploadMediaContentImage);
router.get("/:id", requirePermissions("media:view"), getMediaById);
router.post("/", requirePermissions("media:create"), uploadMediaCover.single("coverImage"), validateMediaCreateUpload, createMedia);
router.patch("/:id", uploadMediaCover.single("coverImage"), validateMediaUpdateUpload, requireMediaUpdatePermission, updateMedia);
router.delete("/:id", requirePermissions("media:delete"), permanentlyDeleteMedia);

export default router;
