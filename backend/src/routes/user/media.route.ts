import { Router } from "express";

import { getMedia, getMediaById } from "../../controllers/user/media.controller";
import { validateQuery } from "../../middlewares/validate.middleware";
import { mediaListQuerySchema } from "../../validates/admin/media.validate";

const router = Router();
router.get("/", validateQuery(mediaListQuerySchema), getMedia);
router.get("/:id", getMediaById);
export default router;

