import { adminAccountRepository } from "../../repositories/admin/account.repository";
import { AppError } from "../../utils/errors/AppError";
import { removeAccountAvatarFile, resolveAccountAvatar } from "../../utils/account/accountAvatar";

/**
 * The person's own account picture. It never changes the employee record: the HR photo
 * stays in the directory and org chart, and is used again when the own picture is removed.
 */
export const accountAvatarService = {
  async set(accountId: string, email: string, upload: { url: string; publicId: string }) {
    const previous = await adminAccountRepository.setAvatar(accountId, upload.url, upload.publicId);
    if (!previous) {
      await removeAccountAvatarFile(upload.publicId);
      throw new AppError(401, "Tài khoản không tồn tại hoặc đã bị khóa");
    }
    if (previous.avatarPublicId && previous.avatarPublicId !== upload.publicId) await removeAccountAvatarFile(previous.avatarPublicId);
    return { avatar: upload.url, customAvatar: true, email };
  },

  async clear(accountId: string, email: string) {
    const previous = await adminAccountRepository.clearAvatar(accountId);
    if (!previous) throw new AppError(401, "Tài khoản không tồn tại hoặc đã bị khóa");
    await removeAccountAvatarFile(previous.avatarPublicId);
    return { avatar: await resolveAccountAvatar({ email, avatar: "" }), customAvatar: false, email };
  },
};
