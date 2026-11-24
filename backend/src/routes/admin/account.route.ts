import { Router } from "express";

import {
  createAccount,
  checkAccountContacts,
  deleteAccount,
  getAccounts,
  getDeletedAccounts,
  lockAccount,
  lookupEmployees,
  permanentlyDeleteAccount,
  resetPassword,
  restoreAccount,
  unlockAccount,
  updateAccount,
} from "../../controllers/admin/account.controller";
import { requirePermissions } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware";
import {
  createAccountSchema,
  checkAccountContactsSchema,
  employeeLookupSchema,
  lockAccountSchema,
  resetPasswordSchema,
  updateAccountSchema,
} from "../../validates/admin/account.validate";

const router = Router();
// The whole router already requires "accounts:manage-users" (index.route.ts).
// The trash additionally requires "accounts:trash"; the service rechecks both.
const trash = requirePermissions("accounts:trash");

router.get("/", getAccounts);
router.get("/trash", trash, getDeletedAccounts);
router.get("/employee-lookup", validateQuery(employeeLookupSchema), lookupEmployees);
router.post("/check-contacts", validateBody(checkAccountContactsSchema), checkAccountContacts);
// Soft delete: moves the account to the trash.
router.delete("/:id", deleteAccount);
router.delete("/:id/permanent", trash, permanentlyDeleteAccount);
router.patch("/:id/restore", trash, restoreAccount);
router.post("/:id/lock", validateBody(lockAccountSchema), lockAccount);
router.post("/:id/unlock", unlockAccount);
router.post(
  "/",
  validateBody(createAccountSchema),
  createAccount,
);
router.patch(
  "/:id",
  validateBody(updateAccountSchema),
  updateAccount,
);
router.patch(
  "/:id/password",
  validateBody(resetPasswordSchema),
  resetPassword,
);

export default router;
