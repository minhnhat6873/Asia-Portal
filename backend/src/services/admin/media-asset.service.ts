import { mediaAssetRepository } from "../../repositories/admin/media-asset.repository";
import { adminMediaRepository } from "../../repositories/admin/media.repository";
import { AppError } from "../../utils/errors/AppError";
import { runTinyMceImageCleanupSoon } from "../../jobs/tinyMceImageCleanup.job";

export const mediaAssetService = {
  registerTemporary(data: { publicId: string; secureUrl: string }) {
    return mediaAssetRepository.registerTemporary(data);
  },

  findManagedPublicIds(htmlValues: string[]) {
    const imageUrls = new Set<string>();
    for (const html of htmlValues) {
      for (const match of html.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
        const url = match[2]?.replace(/&amp;/g, "&").trim();
        if (url) imageUrls.add(url);
      }
    }
    return mediaAssetRepository.findBySecureUrls([...imageUrls]).then((assets) =>
      [...new Set(assets.map((asset) => asset.publicId))],
    );
  },

  async prepareForReference(publicIds: string[]): Promise<void> {
    for (const publicId of new Set(publicIds)) {
      const result = await mediaAssetRepository.prepareForReference(publicId, new Date());
      if (result.matchedCount !== 1) {
        throw new AppError(409, "Một hình ảnh đang được dọn. Vui lòng chọn lại hình ảnh rồi thử lưu.");
      }
    }
  },

  async synchronizeReferenceStatuses(publicIds: string[]): Promise<void> {
    let assets: Awaited<ReturnType<typeof mediaAssetRepository.findByPublicIds>>;
    try {
      assets = await mediaAssetRepository.findByPublicIds([...new Set(publicIds)]);
    } catch {
      console.error("Không thể đọc media asset để đồng bộ; job sẽ reconciliation sau.");
      return;
    }
    let cleanupRequested = false;
    for (const asset of assets) {
      try {
        const checkedAt = new Date();
        const isReferenced = Boolean(await adminMediaRepository.hasContentAssetReference(asset.publicId, asset.secureUrl));
        if (isReferenced) await mediaAssetRepository.markActive(asset.publicId, new Date());
        else {
          const result = await mediaAssetRepository.markPendingDelete(asset.publicId, checkedAt);
          cleanupRequested ||= result.matchedCount > 0;
        }
      } catch {
        // Media documents store the authoritative references; the cleanup job can reconcile status later.
        console.error("Không thể đồng bộ trạng thái media asset; cần reconciliation sau.");
      }
    }
    if (cleanupRequested) runTinyMceImageCleanupSoon();
  },
};
