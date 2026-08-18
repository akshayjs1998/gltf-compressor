import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FilePlus,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQueueStore } from "@/stores/useQueueStore";
import { KTX2OutputType } from "@/types/types";
import { processQueue } from "@/utils/batchQueue";
import { formatSize } from "@/utils/displayUtils";

import { TooltipWrapper } from "./TooltipWrapper";

const RESOLUTION_OPTIONS = [8192, 4096, 2048, 1024, 512, 256, 128];

export function QueuePanel() {
  const [
    items,
    isProcessing,
    currentItemId,
    compressionSettings,
    exportSettings,
    removeItem,
    clearQueue,
    setCompressionSettings,
    setExportSettings,
  ] = useQueueStore(
    useShallow((state) => [
      state.items,
      state.isProcessing,
      state.currentItemId,
      state.compressionSettings,
      state.exportSettings,
      state.removeItem,
      state.clearQueue,
      state.setCompressionSettings,
      state.setExportSettings,
    ])
  );

  const [showKtx2Advanced, setShowKtx2Advanced] = useState(false);

  const pendingOrErroredCount = items.filter(
    (item) => item.status === "pending" || item.status === "error"
  ).length;
  const doneCount = items.filter((item) => item.status === "done").length;
  const errorCount = items.filter((item) => item.status === "error").length;

  const handleAddMoreFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".glb";
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        useQueueStore.getState().addFiles(files);
      }
    };
    input.click();
  };

  const handleProcessQueue = () => {
    processQueue(compressionSettings, exportSettings);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col">
        <header className="border-b sticky top-0 z-50 bg-background">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Batch Queue</h1>
              <p className="text-sm text-muted-foreground">
                {items.length} file{items.length !== 1 ? "s" : ""} queued
                {doneCount > 0 && ` · ${doneCount} done`}
                {errorCount > 0 && ` · ${errorCount} failed`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddMoreFiles}
                disabled={isProcessing}
              >
                <FilePlus className="w-4 h-4" />
                Add Files
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearQueue}
                disabled={isProcessing}
              >
                <Trash2 className="w-4 h-4" />
                Clear Queue
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* File list */}
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                  item.id === currentItemId
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.status === "pending" && (
                    <div className="w-5 h-5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  {item.status === "processing" && (
                    <Loader2 className="w-5 h-5 shrink-0 animate-spin text-blue-600" />
                  )}
                  {item.status === "done" && (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-green-500" />
                  )}
                  {item.status === "error" && (
                    <XCircle className="w-5 h-5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {item.file.name}
                    </p>
                    {item.status === "error" ? (
                      <p className="text-xs text-destructive truncate">
                        {item.errorMessage}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {formatSize(item.originalSizeBytes / 1000)}
                        {item.finalSizeBytes !== null && (
                          <>
                            {" → "}
                            {formatSize(item.finalSizeBytes / 1000)}
                            {item.originalSizeBytes > 0 && (
                              <span className="text-green-500">
                                {" "}
                                (
                                {(
                                  ((item.originalSizeBytes -
                                    item.finalSizeBytes) /
                                    item.originalSizeBytes) *
                                  100
                                ).toFixed(0)}
                                % smaller)
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === "done" && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                    >
                      Done
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={isProcessing && item.id === currentItemId}
                    aria-label={`Remove ${item.file.name} from queue`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No files queued. Click &quot;Add Files&quot; to queue more .glb
                files.
              </p>
            )}
          </div>

          {/* Settings + run */}
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h2 className="font-semibold text-foreground">
                Compression Settings
              </h2>
              <p className="text-xs text-muted-foreground">
                Applied to every texture in every queued file.
              </p>

              <div>
                <Label htmlFor="queue-format-select">Format</Label>
                <div className="pt-1">
                  <Select
                    value={compressionSettings.mimeType}
                    onValueChange={(mimeType) =>
                      setCompressionSettings({ mimeType })
                    }
                    disabled={isProcessing}
                  >
                    <SelectTrigger id="queue-format-select">
                      <SelectValue placeholder="Select Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image/jpeg">JPEG</SelectItem>
                      <SelectItem value="image/png">PNG</SelectItem>
                      <SelectItem value="image/webp">WebP</SelectItem>
                      <SelectItem value="image/ktx2">KTX2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="queue-resolution-select">Max Resolution</Label>
                <div className="pt-1">
                  <Select
                    value={compressionSettings.maxResolution.toString()}
                    onValueChange={(value) =>
                      setCompressionSettings({
                        maxResolution: parseInt(value, 10),
                      })
                    }
                    disabled={isProcessing}
                  >
                    <SelectTrigger id="queue-resolution-select">
                      <SelectValue placeholder="Select Resolution" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="queue-quality-slider">
                  Quality: {compressionSettings.quality.toFixed(2)}
                </Label>
                <Slider
                  id="queue-quality-slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[compressionSettings.quality]}
                  onValueChange={(value: number[]) =>
                    setCompressionSettings({ quality: value[0] })
                  }
                  disabled={isProcessing}
                />
              </div>

              {compressionSettings.mimeType === "image/ktx2" && (
                <div className="-mt-1">
                  <div
                    className="flex items-center space-x-2 cursor-pointer select-none hover:underline"
                    onClick={() => setShowKtx2Advanced(!showKtx2Advanced)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setShowKtx2Advanced(!showKtx2Advanced);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    {showKtx2Advanced ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      Advanced KTX2 Options
                    </span>
                  </div>

                  {showKtx2Advanced && (
                    <div className="space-y-3 pl-3 pt-2 border-l-2 border-muted">
                      <div>
                        <Label htmlFor="queue-ktx2-output-type-select">
                          Output Type
                        </Label>
                        <div className="pt-1">
                          <Select
                            value={compressionSettings.ktx2Options.outputType}
                            onValueChange={(value: KTX2OutputType) =>
                              setCompressionSettings({
                                ktx2Options: {
                                  ...compressionSettings.ktx2Options,
                                  outputType: value,
                                },
                              })
                            }
                            disabled={isProcessing}
                          >
                            <SelectTrigger id="queue-ktx2-output-type-select">
                              <SelectValue placeholder="Select Output Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UASTC">UASTC</SelectItem>
                              <SelectItem value="ETC1S">ETC1S</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id="queue-ktx2-generate-mipmaps"
                          checked={
                            compressionSettings.ktx2Options.generateMipmaps
                          }
                          onCheckedChange={(checked) =>
                            setCompressionSettings({
                              ktx2Options: {
                                ...compressionSettings.ktx2Options,
                                generateMipmaps: checked,
                              },
                            })
                          }
                          disabled={isProcessing}
                        />
                        <Label htmlFor="queue-ktx2-generate-mipmaps">
                          Generate Mipmaps
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id="queue-ktx2-normal-map"
                          checked={compressionSettings.ktx2Options.isNormalMap}
                          onCheckedChange={(checked) =>
                            setCompressionSettings({
                              ktx2Options: {
                                ...compressionSettings.ktx2Options,
                                isNormalMap: checked,
                              },
                            })
                          }
                          disabled={isProcessing}
                        />
                        <Label htmlFor="queue-ktx2-normal-map">
                          Normal Map
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h2 className="font-semibold text-foreground">
                Mesh & Export Options
              </h2>

              <TooltipWrapper content="Compress mesh geometry with Draco">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="queue-draco-compress-switch"
                    checked={exportSettings.dracoCompress}
                    onCheckedChange={(checked) =>
                      setExportSettings({ dracoCompress: checked })
                    }
                    disabled={isProcessing}
                  />
                  <Label htmlFor="queue-draco-compress-switch">
                    Draco Compress
                  </Label>
                </div>
              </TooltipWrapper>

              <TooltipWrapper content="Remove duplicate meshes, materials, textures, etc.">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="queue-deduplicate-switch"
                    checked={exportSettings.deduplicate}
                    onCheckedChange={(checked) =>
                      setExportSettings({ deduplicate: checked })
                    }
                    disabled={isProcessing}
                  />
                  <Label htmlFor="queue-deduplicate-switch">Deduplicate</Label>
                </div>
              </TooltipWrapper>

              <TooltipWrapper content="Reduce nesting of the scene graph and join compatible meshes">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="queue-flatten-and-join-switch"
                    checked={exportSettings.flattenAndJoin}
                    onCheckedChange={(checked) =>
                      setExportSettings({ flattenAndJoin: checked })
                    }
                    disabled={isProcessing}
                  />
                  <Label htmlFor="queue-flatten-and-join-switch">
                    Flatten & Join
                  </Label>
                </div>
              </TooltipWrapper>

              <TooltipWrapper content="Index all mesh geometry, removing duplicate vertices">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="queue-weld-switch"
                    checked={exportSettings.weld}
                    onCheckedChange={(checked) =>
                      setExportSettings({ weld: checked })
                    }
                    disabled={isProcessing}
                  />
                  <Label htmlFor="queue-weld-switch">Weld</Label>
                </div>
              </TooltipWrapper>

              <TooltipWrapper content="Losslessly resample animation frames">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="queue-resample-switch"
                    checked={exportSettings.resample}
                    onCheckedChange={(checked) =>
                      setExportSettings({ resample: checked })
                    }
                    disabled={isProcessing}
                  />
                  <Label htmlFor="queue-resample-switch">Resample</Label>
                </div>
              </TooltipWrapper>

              <TooltipWrapper content="Remove unused nodes, textures, materials, etc.">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="queue-prune-switch"
                    checked={exportSettings.prune}
                    onCheckedChange={(checked) =>
                      setExportSettings({ prune: checked })
                    }
                    disabled={isProcessing}
                  />
                  <Label htmlFor="queue-prune-switch">Prune</Label>
                </div>
              </TooltipWrapper>
            </div>

            <Button
              onClick={handleProcessQueue}
              className="w-full"
              disabled={isProcessing || pendingOrErroredCount === 0}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Process ${pendingOrErroredCount} File${
                  pendingOrErroredCount !== 1 ? "s" : ""
                }`
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default QueuePanel;
