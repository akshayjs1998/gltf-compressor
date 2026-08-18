import { WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

import { trackError, trackQueueProcessed } from "@/lib/analytics";
import { useQueueStore } from "@/stores/useQueueStore";
import { BatchCompressionSettings, BatchExportSettings } from "@/types/types";
import { exportDocument } from "@/utils/fileIO";
import { compressTexture } from "@/utils/textureCompression";

const isGLBFile = (name: string): boolean => /\.glb$/i.test(name);

/**
 * Loads a standalone glTF-Transform Document from a File without creating a
 * DocumentView or a rendered scene. Batch queue processing never renders the
 * model, so skipping that setup keeps each file fast and memory-light.
 */
async function loadDocumentFromFile(file: File) {
  const io = new WebIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.encoder":
        // @ts-ignore
        await new DracoEncoderModule(),
      "draco3d.decoder":
        // @ts-ignore
        await new DracoDecoderModule(),
      "meshopt.decoder": MeshoptDecoder,
    });

  const url = URL.createObjectURL(file);
  try {
    return await io.read(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Processes every "pending" (or previously errored) item in the batch queue
 * sequentially: loads the file, applies the shared compression settings to
 * every texture, applies the shared mesh/animation export options, then
 * triggers an individual download for the compressed .glb. Progress and
 * results are written back to the queue store as each file completes so the
 * UI can reflect status live.
 */
export async function processQueue(
  compressionSettings: BatchCompressionSettings,
  exportSettings: BatchExportSettings
): Promise<void> {
  const queueStore = useQueueStore.getState();

  if (queueStore.isProcessing) return;

  const itemsToProcess = queueStore.items.filter(
    (item) => item.status === "pending" || item.status === "error"
  );

  if (itemsToProcess.length === 0) return;

  useQueueStore.setState({ isProcessing: true });

  let succeeded = 0;
  let failed = 0;
  let originalTotalBytes = 0;
  let finalTotalBytes = 0;
  const startMs = Date.now();

  for (const item of itemsToProcess) {
    // The item may have been removed from the queue while a previous item
    // in this loop was processing; skip it if so.
    if (!useQueueStore.getState().items.some((i) => i.id === item.id)) {
      continue;
    }

    useQueueStore.getState().setCurrentItemId(item.id);
    useQueueStore.getState().updateItem(item.id, {
      status: "processing",
      errorMessage: null,
    });

    try {
      if (!isGLBFile(item.file.name)) {
        throw new Error(
          "Only .glb files are supported in the batch queue. Load .gltf files individually instead."
        );
      }

      const document = await loadDocumentFromFile(item.file);
      const textures = document.getRoot().listTextures();

      for (const texture of textures) {
        const resolution = texture.getSize() ?? [0, 0];
        const textureMaxResolution = Math.max(resolution[0], resolution[1]);
        const effectiveMaxResolution =
          textureMaxResolution > 0
            ? Math.min(compressionSettings.maxResolution, textureMaxResolution)
            : compressionSettings.maxResolution;

        // Compress each texture in place: the texture is its own
        // compression target, so `compressTexture` overwrites its image
        // data directly rather than writing into a separate "modified"
        // document (there is no side-by-side comparison in batch mode).
        await compressTexture(texture, {
          compressedTexture: texture,
          compressionEnabled: true,
          mimeType: compressionSettings.mimeType,
          maxResolution: effectiveMaxResolution,
          quality: compressionSettings.quality,
          isBeingCompressed: false,
          ktx2Options: compressionSettings.ktx2Options,
        });
      }

      const finalSizeBytes = await exportDocument(
        item.fileName,
        document,
        exportSettings.dracoCompress,
        exportSettings.deduplicate,
        exportSettings.flattenAndJoin,
        exportSettings.weld,
        exportSettings.resample,
        exportSettings.prune
      );

      succeeded += 1;
      originalTotalBytes += item.originalSizeBytes;
      finalTotalBytes += finalSizeBytes;

      useQueueStore.getState().updateItem(item.id, {
        status: "done",
        finalSizeBytes,
      });
    } catch (error) {
      console.error(`Error processing queued file "${item.fileName}":`, error);
      trackError({ phase: "export", category: "queue_item_failed" });
      failed += 1;

      useQueueStore.getState().updateItem(item.id, {
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  trackQueueProcessed({
    fileCount: itemsToProcess.length,
    succeeded,
    failed,
    originalTotalSizeKB: originalTotalBytes / 1000,
    finalTotalSizeKB: finalTotalBytes / 1000,
    durationSec: (Date.now() - startMs) / 1000,
  });

  useQueueStore.getState().setCurrentItemId(null);
  useQueueStore.setState({ isProcessing: false });
}
