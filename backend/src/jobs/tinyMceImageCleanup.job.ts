import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import { destroyTinyMceCloudinaryAsset, isManagedTinyMcePublicId } from "../helpers/multerCloudinary.helper";
import MediaAssetModel from "../models/media-asset.model";
import { mediaAssetRepository } from "../repositories/admin/media-asset.repository";
import { adminMediaRepository } from "../repositories/admin/media.repository";

const CLEANUP_INTERVAL_MS = 60_000;
const CLEANUP_BATCH_SIZE = 50;
const IMAGE_RETENTION_MS = 24 * 60 * 60 * 1000;
const CLAIM_LEASE_MS = 10 * 60 * 1000;

let interval: NodeJS.Timeout | undefined;
let isRunning = false;
let indexesReady: Promise<void> | undefined;

function ensureIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = Promise.resolve()
      .then(() => MediaAssetModel.createIndexes())
      .then(() => undefined)
      .catch((error: unknown) => {
        indexesReady = undefined;
        throw error;
      });
  }
  return indexesReady;
}

async function releaseClaim(id: string, claimId: string): Promise<void> {
  try {
    await mediaAssetRepository.releaseDeletionClaim(id, claimId);
  } catch {
    // A later run can reclaim the expired lease and retry safely.
  }
}

async function cleanupTinyMceImages(): Promise<void> {
  if (isRunning || mongoose.connection.readyState !== 1) return;
  isRunning = true;

  try {
    await ensureIndexes();
    const now = new Date();
    const cutoff = new Date(now.getTime() - IMAGE_RETENTION_MS);
    const expiredClaimBefore = new Date(now.getTime() - CLAIM_LEASE_MS);
    const candidates = await mediaAssetRepository.findCleanupCandidates(cutoff, now, expiredClaimBefore, CLEANUP_BATCH_SIZE);

    for (const candidate of candidates) {
      const id = String(candidate._id);
      const publicId = candidate.publicId;
      let claimId: string | undefined;

      try {
        if (!isManagedTinyMcePublicId(publicId)) {
          console.error("TinyMCE cleanup skipped an asset outside the managed Cloudinary folder.");
          continue;
        }

        if (await adminMediaRepository.hasContentAssetReference(publicId, candidate.secureUrl)) {
          await mediaAssetRepository.markActive(publicId, new Date());
          continue;
        }

        if (candidate.status === "active") {
          // Recover an active asset left unreferenced by an interrupted save/reconciliation.
          await mediaAssetRepository.markPendingDelete(publicId, new Date());
          continue;
        }

        if (candidate.status !== "temporary" && candidate.status !== "pending_delete") continue;
        claimId = randomUUID();
        const claimed = await mediaAssetRepository.claimForDeletion(
          id,
          candidate.status,
          now,
          cutoff,
          claimId,
          expiredClaimBefore,
        );
        if (!claimed) continue;

        if (await adminMediaRepository.hasContentAssetReference(publicId, candidate.secureUrl)) {
          await mediaAssetRepository.markActive(publicId, new Date());
          continue;
        }
        if (!await mediaAssetRepository.isDeletionClaimCurrent(id, claimId)) continue;

        const result = await destroyTinyMceCloudinaryAsset(publicId);
        if (result.result !== "ok" && result.result !== "not found") {
          await releaseClaim(id, claimId);
          console.error("Cloudinary did not confirm TinyMCE asset deletion; it will be retried.");
          continue;
        }

        await mediaAssetRepository.deleteAfterCloudinaryConfirmation(id, claimId);
      } catch {
        if (claimId) await releaseClaim(id, claimId);
        console.error("TinyMCE image cleanup failed; asset metadata was retained for retry.");
      }
    }
  } catch {
    console.error("TinyMCE image cleanup job failed; a later run will retry.");
  } finally {
    isRunning = false;
  }
}

export function startTinyMceImageCleanupJob(): void {
  if (interval) return;

  interval = setInterval(() => {
    void cleanupTinyMceImages();
  }, CLEANUP_INTERVAL_MS);
  interval.unref();

  void cleanupTinyMceImages();
}

export function runTinyMceImageCleanupSoon(): void {
  void cleanupTinyMceImages();
}
