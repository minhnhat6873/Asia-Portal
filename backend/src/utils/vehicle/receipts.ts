import { deleteCloudinaryAsset, VEHICLE_RECEIPT_FOLDER } from "../../helpers/multerCloudinary.helper";

/** Removes uploaded trip pictures. Only files in the vehicle-receipt folder are touched. */
export async function removeVehicleReceiptFiles(publicIds: (string | undefined)[]): Promise<void> {
  for (const publicId of publicIds) {
    if (!publicId || !publicId.startsWith(`${VEHICLE_RECEIPT_FOLDER}/`) || publicId.includes("..")) continue;
    try { await deleteCloudinaryAsset(publicId); } catch { console.error("Không thể xóa ảnh chuyến xe trên Cloudinary."); }
  }
}
