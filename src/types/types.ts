import { Texture } from "@gltf-transform/core";

export type KTX2OutputType = "UASTC" | "ETC1S";

export interface KTX2Options {
  outputType: KTX2OutputType;
  generateMipmaps: boolean;
  isNormalMap: boolean;
  srgbTransferFunction: boolean;
  enableSupercompression: boolean;
  enableRDO: boolean;
  rdoQualityLevel: number;
}

export const defaultKTX2Options: KTX2Options = {
  outputType: "UASTC",
  generateMipmaps: true,
  isNormalMap: false,
  srgbTransferFunction: true,
  enableSupercompression: true,
  enableRDO: false,
  rdoQualityLevel: 1.0,
};

export interface TextureCompressionSettings {
  compressedTexture: Texture | null;
  compressionEnabled: boolean;
  mimeType: string;
  maxResolution: number;
  quality: number;
  isBeingCompressed: boolean;
  ktx2Options: KTX2Options;
}

export interface ModelStats {
  numMeshes: number;
  numVertices: number;
  numTextures: number;
  numAnimationClips: number;
  sizeOfMeshes: number;
  sizeOfTextures: number;
  sizeOfAnimations: number;
  totalSize: number;
  percentOfSizeTakenByMeshes: number;
  percentOfSizeTakenByTextures: number;
  percentOfSizeTakenByAnimations: number;
  initialSizeOfTextures: number;
  percentChangeInTextures: number;
  texturesInModifiedDocument: Texture[];
  initialTotalSize: number;
  percentChangeInTotalSize: number;
}

export interface TextureBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  bottom: number;
  statusShouldBeAboveBottomEdge: boolean;
}

// ---------- Batch queue types ----------

/**
 * The texture compression settings that are applied to every texture of
 * every file in the batch queue. Unlike `TextureCompressionSettings`, these
 * are not tied to a specific `Texture` instance since queued files aren't
 * loaded into memory (or the 3D viewport) until they're processed.
 */
export interface BatchCompressionSettings {
  mimeType: string;
  maxResolution: number;
  quality: number;
  ktx2Options: KTX2Options;
}

export const defaultBatchCompressionSettings: BatchCompressionSettings = {
  mimeType: "image/jpeg",
  maxResolution: 2048,
  quality: 0.8,
  ktx2Options: { ...defaultKTX2Options },
};

export interface BatchExportSettings {
  dracoCompress: boolean;
  deduplicate: boolean;
  flattenAndJoin: boolean;
  weld: boolean;
  resample: boolean;
  prune: boolean;
}

export const defaultBatchExportSettings: BatchExportSettings = {
  dracoCompress: false,
  deduplicate: false,
  flattenAndJoin: false,
  weld: false,
  resample: false,
  prune: false,
};

export type QueueItemStatus =
  | "pending"
  | "processing"
  | "done"
  | "error";

export interface QueueItem {
  id: string;
  file: File;
  fileName: string;
  status: QueueItemStatus;
  originalSizeBytes: number;
  finalSizeBytes: number | null;
  errorMessage: string | null;
}
