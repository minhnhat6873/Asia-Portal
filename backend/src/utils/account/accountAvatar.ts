import { ACCOUNT_AVATAR_FOLDER, deleteCloudinaryAsset } from "../../helpers/multerCloudinary.helper";
import { adminEmployeeRepository } from "../../repositories/admin/employee.repository";

interface AvatarSource { _id?: unknown; email: string; avatar?: string | null }

/**
 * The picture shown for an account: the person's own upload, otherwise the photo on
 * the employee record with the same email, otherwise "" (the site shows initials).
 */
export async function resolveAccountAvatar(account: AvatarSource): Promise<string> {
  if (account.avatar) return account.avatar;
  return (await adminEmployeeRepository.findAvatarsByEmails([account.email])).get(account.email.trim().toLowerCase()) ?? "";
}

/** Same as resolveAccountAvatar for a list, with one employee query. Keyed by account id. */
export async function resolveAccountAvatars(accounts: AvatarSource[]): Promise<Map<string, string>> {
  const employeeAvatars = await adminEmployeeRepository.findAvatarsByEmails(accounts.filter((account) => !account.avatar).map((account) => account.email));
  return new Map(accounts.map((account) => [
    String(account._id),
    account.avatar || employeeAvatars.get(account.email.trim().toLowerCase()) || "",
  ]));
}

/** Removes an uploaded account picture. Only files in the account-avatar folder are touched. */
export async function removeAccountAvatarFile(publicId?: string | null): Promise<void> {
  if (!publicId || !publicId.startsWith(`${ACCOUNT_AVATAR_FOLDER}/`) || publicId.includes("..")) return;
  try {
    await deleteCloudinaryAsset(publicId);
  } catch {
    console.error("Không thể xóa ảnh đại diện tài khoản cũ trên Cloudinary.");
  }
}
