import { Router } from "express";

import {
  arrangeVehicleBooking,
  cancelVehicleBooking,
  completeVehicleBooking,
  deleteVehicleBooking,
  exportVehicleReport,
  getVehicleBooking,
  getVehicleReport,
  listVehicleBookings,
} from "../../controllers/vehicle-booking.controller";
import { uploadVehicleReceipts } from "../../helpers/multerCloudinary.helper";
import { requirePermissions } from "../../middlewares/auth.middleware";
import { validateVehicleMultipart } from "../../middlewares/multipart-validate.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware";
import {
  vehicleArrangeSchema,
  vehicleCompleteSchema,
  vehicleHrCancelSchema,
  vehicleListQuerySchema,
  vehicleReportQuerySchema,
} from "../../validates/vehicle-booking.validate";

// Mounted after requireAdminAuth and requirePermissions("vehicles:manage").
const router = Router();

router.get("/", validateQuery(vehicleListQuerySchema), listVehicleBookings);
router.get("/report", validateQuery(vehicleReportQuerySchema), getVehicleReport);
router.get("/report/export", validateQuery(vehicleReportQuerySchema), exportVehicleReport);
router.get("/:id", getVehicleBooking);
router.patch("/:id", validateBody(vehicleArrangeSchema), arrangeVehicleBooking);
router.post("/:id/complete", uploadVehicleReceipts.array("receipts", 3), validateVehicleMultipart(vehicleCompleteSchema), completeVehicleBooking);
router.post("/:id/cancel", validateBody(vehicleHrCancelSchema), cancelVehicleBooking);
// Deleting needs its own right on top of managing.
router.delete("/:id", requirePermissions("vehicles:delete"), deleteVehicleBooking);

export default router;
