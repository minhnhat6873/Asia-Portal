import { Router } from "express";

import {
  createGroup,
  deleteGroup,
  getGroups,
  getPermissionCatalog,
  updateGroup,
} from "../../controllers/admin/permission-group.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import {
  createPermissionGroupSchema,
  updatePermissionGroupSchema,
} from "../../validates/admin/permission-group.validate";

const router = Router();

router.get("/", getGroups);
router.get("/catalog", getPermissionCatalog);
router.post("/", validateBody(createPermissionGroupSchema), createGroup);
router.patch("/:id", validateBody(updatePermissionGroupSchema), updateGroup);
router.delete("/:id", deleteGroup);

export default router;
