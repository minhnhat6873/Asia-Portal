import { Router } from "express";

import { getMedia, getMediaById } from "../../controllers/user/media.controller";
import { requireUserAuth } from "../../middlewares/user-auth.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { mediaListQuerySchema } from "../../validates/admin/media.validate";

const router = Router();
// The whole portal is internal: news is for signed-in accounts only.
router.use(requireUserAuth, (_request, response, next) => { response.setHeader("Cache-Control", "private, no-store"); next(); });
router.get("/", validateQuery(mediaListQuerySchema), getMedia);
router.get("/:id", getMediaById);
export default router;
