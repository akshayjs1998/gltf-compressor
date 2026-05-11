import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";
const PROD_HOST = "gltf-compressor.com";

let enabled = false;

// Session-scoped flags, reset every time a new model is loaded.
// These let `export_completed` describe how the user got there.
let sessionStartMs: number | null = null;
let usedBulkEditing = false;
let usedAdvancedEditing = false;
// Raw uploaded byte count, when available. Lets `export_completed` compute
// reduction against the same baseline that `model_loaded` reports.
let sourceSizeBytes: number | null = null;

export function initAnalytics() {
  if (!KEY) return;
  if (typeof window === "undefined") return;
  if (window.location.hostname !== PROD_HOST) return;

  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: true,
    persistence: "memory",
  });
  enabled = true;
}

function track(event: string, props?: Record<string, unknown>) {
  if (!enabled) return;
  posthog.capture(event, props);
}

function shortFormat(mime: string): string {
  if (mime === "image/jpeg") return "jpeg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/ktx2") return "ktx2";
  return mime;
}

// ---------- Event wrappers ----------

export type ModelLoadSource = "dropzone" | "url_param" | "demo";

export function trackModelLoaded(args: {
  source: ModelLoadSource;
  format: "glb" | "gltf";
  sourceSizeBytes: number | null;
  inMemorySizeKB: number;
  textureSizeKB: number;
  textureCount: number;
  meshCount: number;
  animationCount: number;
  extensions: string[];
}) {
  // Reset session state for the new model.
  sessionStartMs = Date.now();
  usedBulkEditing = false;
  usedAdvancedEditing = false;
  sourceSizeBytes = args.sourceSizeBytes;

  const fileSizeKB =
    args.sourceSizeBytes !== null
      ? args.sourceSizeBytes / 1000
      : args.inMemorySizeKB;

  track("model_loaded", {
    source: args.source,
    format: args.format,
    file_size_kb: Math.round(fileSizeKB),
    texture_size_kb: Math.round(args.textureSizeKB),
    texture_count: args.textureCount,
    mesh_count: args.meshCount,
    animation_count: args.animationCount,
    extensions: args.extensions,
  });
}

export type TextureSetting =
  | "format"
  | "resolution"
  | "quality"
  | "compression";

export function trackTextureModified(args: {
  setting: TextureSetting;
  value: string | number | boolean;
}) {
  usedAdvancedEditing = true;

  let valueProp: string | number | boolean = args.value;
  if (args.setting === "format" && typeof args.value === "string") {
    valueProp = shortFormat(args.value);
  } else if (args.setting === "quality" && typeof args.value === "number") {
    valueProp = Number(args.value.toFixed(2));
  } else if (args.setting === "resolution" && typeof args.value === "number") {
    valueProp = args.value;
  }

  track("texture_modified", {
    setting: args.setting,
    value: valueProp,
  });
}

export type BulkSetting =
  | "format"
  | "resolution"
  | "quality"
  | "ktx2_output_type"
  | "ktx2_generate_mipmaps"
  | "ktx2_supercompression"
  | "ktx2_rdo"
  | "ktx2_rdo_quality";

export function trackBulkOperation(args: {
  setting: BulkSetting;
  value: string | number | boolean;
  affectedTextureCount: number;
  durationSec: number;
}) {
  usedBulkEditing = true;

  let valueProp: string | number | boolean = args.value;
  if (args.setting === "format" && typeof args.value === "string") {
    valueProp = shortFormat(args.value);
  } else if (args.setting === "quality" && typeof args.value === "number") {
    valueProp = Number(args.value.toFixed(2));
  } else if (args.setting === "resolution" && typeof args.value === "number") {
    valueProp = args.value;
  } else if (
    args.setting === "ktx2_rdo_quality" &&
    typeof args.value === "number"
  ) {
    valueProp = Number(args.value.toFixed(1));
  }

  track("bulk_operation_applied", {
    setting: args.setting,
    value: valueProp,
    affected_texture_count: args.affectedTextureCount,
    duration_s: Number(args.durationSec.toFixed(1)),
  });
}

export function trackExportCompleted(args: {
  textureMimeTypes: string[];
  fallbackOriginalSizeKB: number;
  finalSizeKB: number;
  originalTextureSizeKB: number;
  finalTextureSizeKB: number;
  usedDracoCompression: boolean;
  optimizations: string[];
}) {
  const formatDistribution: Record<string, number> = {
    jpeg: 0,
    png: 0,
    webp: 0,
    ktx2: 0,
  };
  for (const mime of args.textureMimeTypes) {
    const f = shortFormat(mime);
    if (formatDistribution[f] !== undefined) formatDistribution[f]++;
  }

  const durationSec = sessionStartMs
    ? (Date.now() - sessionStartMs) / 1000
    : 0;

  const originalSizeKB =
    sourceSizeBytes !== null
      ? sourceSizeBytes / 1000
      : args.fallbackOriginalSizeKB;
  const reductionPct =
    originalSizeKB > 0
      ? ((originalSizeKB - args.finalSizeKB) / originalSizeKB) * 100
      : 0;
  const textureReductionPct =
    args.originalTextureSizeKB > 0
      ? ((args.originalTextureSizeKB - args.finalTextureSizeKB) /
          args.originalTextureSizeKB) *
        100
      : 0;

  track("export_completed", {
    session_duration_s: Math.round(durationSec),
    original_file_size_kb: Math.round(originalSizeKB),
    final_file_size_kb: Math.round(args.finalSizeKB),
    file_reduction_pct: Number(reductionPct.toFixed(1)),
    original_texture_size_kb: Math.round(args.originalTextureSizeKB),
    final_texture_size_kb: Math.round(args.finalTextureSizeKB),
    texture_reduction_pct: Number(textureReductionPct.toFixed(1)),
    format_distribution: formatDistribution,
    used_draco_compression: args.usedDracoCompression,
    optimizations: args.optimizations,
    used_bulk_editing: usedBulkEditing,
    used_advanced_editing: usedAdvancedEditing,
  });
}

export type ErrorPhase = "parse" | "url_param_fetch" | "export";

export function trackError(args: { phase: ErrorPhase; category: string }) {
  track("error_occurred", {
    phase: args.phase,
    category: args.category,
  });
}
