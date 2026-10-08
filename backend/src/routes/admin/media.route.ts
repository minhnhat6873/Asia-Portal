import { Router } from "express";

import { createMedia, getMedia, getMediaById, permanentlyDeleteMedia, updateMedia } from "../../controllers/admin/media.controller";
import { uploadMediaCover } from "../../helpers/multerCloudinary.helper";
import { requireMediaUpdatePermission, requirePermissions } from "../../middlewares/auth.middleware";
import { validateMediaCreateUpload, validateMediaUpdateUpload } from "../../middlewares/media-upload.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { mediaListQuerySchema } from "../../validates/admin/media.validate";

const router = Router();

router.get("/", requirePermissions("media:view"), validateQuery(mediaListQuerySchema), getMedia);
router.get("/:id", requirePermissions("media:view"), getMediaById);
router.post("/", requirePermissions("media:create"), uploadMediaCover.single("coverImage"), validateMediaCreateUpload, createMedia);
router.patch("/:id", uploadMediaCover.single("coverImage"), validateMediaUpdateUpload, requireMediaUpdatePermission, updateMedia);
router.delete("/:id", requirePermissions("media:delete"), permanentlyDeleteMedia);

export default router;
