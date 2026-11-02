import type { Request } from "express";
import { deleteCloudinaryAsset, getCloudinaryPublicIdFromUrl } from "../../helpers/multerCloudinary.helper";

type UploadedAvatar = Express.Multer.File & { secure_url?: string };
type UploadRequest = Pick<Request, "file" | "files">;

export function getEmployeeAvatarUploads(request: UploadRequest) {
  const files = request.files && !Array.isArray(request.files) ? request.files : {};
  return {
    avatar: (files.avatar?.[0] ?? request.file) as UploadedAvatar | undefined,
    original: files.avatarOriginal?.[0] as UploadedAvatar | undefined,
  };
}

export async function deleteEmployeeAvatarUploads(request: UploadRequest): Promise<void> {
  const { avatar, original } = getEmployeeAvatarUploads(request);
  const ids = new Set([avatar?.filename, original?.filename].filter((id): id is string => Boolean(id)));
  await Promise.allSettled([...ids].map((id) => deleteCloudinaryAsset(id)));
}

export function employeeAvatarAssetIds(employee: {
  avatar?: string; avatarPublicId?: string; avatarOriginal?: string; avatarOriginalPublicId?: string;
}): string[] {
  return [...new Set([
    employee.avatarPublicId || getCloudinaryPublicIdFromUrl(employee.avatar),
    employee.avatarOriginalPublicId || getCloudinaryPublicIdFromUrl(employee.avatarOriginal),
  ].filter((id): id is string => Boolean(id)))];
}
