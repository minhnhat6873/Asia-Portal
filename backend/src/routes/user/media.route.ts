import { Router } from "express";

import { getMedia, getMediaById } from "../../controllers/user/media.controller";
import { attachUser } from "../../middlewares/user-auth.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { mediaListQuerySchema } from "../../validates/admin/media.validate";

const router = Router();
// Guests get public posts only; the answer depends on the session, so never cache it.
router.use(attachUser, (_request, response, next) => { response.setHeader("Cache-Control", "private, no-store"); next(); });
router.get("/", validateQuery(mediaListQuerySchema), getMedia);
router.get("/:id", getMediaById);
export default router;
