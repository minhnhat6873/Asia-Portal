import { Router } from "express";
import { getPublicSiteSettings } from "../../controllers/user/site-settings.controller";
import { updateSiteSettings } from "../../controllers/admin/site-settings.controller";
import { requireAdminRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { siteSettingsSchema } from "../../validates/admin/site-settings.validate";

const router = Router();
router.use(requireAdminRole("admin"));
router.get("/", getPublicSiteSettings);
router.patch("/", validateBody(siteSettingsSchema), updateSiteSettings);
export default router;
