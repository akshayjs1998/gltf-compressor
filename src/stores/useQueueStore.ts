import { produce } from "immer";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import {
  BatchCompressionSettings,
  BatchExportSettings,
  defaultBatchCompressionSettings,
  defaultBatchExportSettings,
  QueueItem,
} from "@/types/types";

let idCounter = 0;
const nextQueueItemId = () => `queue_item_${Date.now()}_${++idCounter}`;

interface QueueStore {
  items: QueueItem[];
  isProcessing: boolean;
  currentItemId: string | null;
  compressionSettings: BatchCompressionSettings;
  exportSettings: BatchExportSettings;

  addFiles: (files: File[]) => void;
  removeItem: (id: string) => void;
  clearQueue: () => void;
  updateItem: (id: string, patch: Partial<QueueItem>) => void;
  resetForReprocessing: () => void;
  setProcessing: (isProcessing: boolean) => void;
  setCurrentItemId: (id: string | null) => void;
  setCompressionSettings: (settings: Partial<BatchCompressionSettings>) => void;
  setExportSettings: (settings: Partial<BatchExportSettings>) => void;
}

export const useQueueStore = create<QueueStore>()(
  subscribeWithSelector((set, get) => ({
    items: [],
    isProcessing: false,
    currentItemId: null,
    compressionSettings: { ...defaultBatchCompressionSettings },
    exportSettings: { ...defaultBatchExportSettings },

    addFiles: (files: File[]) => {
      const newItems: QueueItem[] = files.map((file) => ({
        id: nextQueueItemId(),
        file,
        fileName: file.name.replace(/\.[^./]+$/, ""),
        status: "pending",
        originalSizeBytes: file.size,
        finalSizeBytes: null,
        errorMessage: null,
      }));

      set((state) => ({ items: [...state.items, ...newItems] }));
    },

    removeItem: (id: string) => {
      const { isProcessing, currentItemId } = get();
      if (isProcessing && currentItemId === id) return;

      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    },

    clearQueue: () => {
      if (get().isProcessing) return;
      set({ items: [], isProcessing: false, currentItemId: null });
    },

    updateItem: (id: string, patch: Partial<QueueItem>) => {
      set(
        produce((state: QueueStore) => {
          const item = state.items.find((item) => item.id === id);
          if (item) {
            Object.assign(item, patch);
          }
        })
      );
    },

    resetForReprocessing: () => {
      set(
        produce((state: QueueStore) => {
          state.items.forEach((item) => {
            item.status = "pending";
            item.finalSizeBytes = null;
            item.errorMessage = null;
          });
        })
      );
    },

    setProcessing: (isProcessing: boolean) => set({ isProcessing }),
    setCurrentItemId: (id: string | null) => set({ currentItemId: id }),

    setCompressionSettings: (settings: Partial<BatchCompressionSettings>) => {
      set((state) => ({
        compressionSettings: { ...state.compressionSettings, ...settings },
      }));
    },

    setExportSettings: (settings: Partial<BatchExportSettings>) => {
      set((state) => ({
        exportSettings: { ...state.exportSettings, ...settings },
      }));
    },
  }))
);
