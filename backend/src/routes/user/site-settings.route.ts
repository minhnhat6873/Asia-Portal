import { Router } from "express";
import { getPublicSiteSettings } from "../../controllers/user/site-settings.controller";

const router = Router();
router.get("/", getPublicSiteSettings);
export default router;
