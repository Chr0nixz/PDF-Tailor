import { create } from "zustand";
import type {
  CropMode,
  CropRect,
  DocumentLoadState,
  PageCropState,
  PageMetadata,
  PdfUnit,
  PresetAnchor,
} from "@/types";

const HISTORY_LIMIT = 50;

type HistorySnapshot = Record<number, PageCropState>;

interface DragState {
  pageIndex: number | null;
  action: "create" | "move" | "resize" | null;
  handle: string | null;
}

interface PdfStoreState {
  file: File | null;
  fileName: string | null;
  fileBuffer: Uint8Array | null;
  pageCount: number;
  pages: PageMetadata[];
  currentPageIndex: number;
  selectedPageIndices: number[];
  zoom: number;
  documentLoadState: DocumentLoadState;
  documentLoadProgress: number | null;
  displayUnit: PdfUnit;
  pageCrops: Record<number, PageCropState>;
  activeDragState: DragState;
  previewOpen: boolean;
  exportDialogOpen: boolean;
  errorMessage: string | null;
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  setDocument: (payload: {
    file: File;
    fileBuffer: Uint8Array;
    fileName: string;
    pageCount?: number;
    pages?: PageMetadata[];
  }) => void;
  clearDocument: () => void;
  setPages: (pages: PageMetadata[]) => void;
  setCurrentPage: (pageIndex: number) => void;
  toggleSelectedPage: (pageIndex: number, multiSelect?: boolean) => void;
  setZoom: (zoom: number) => void;
  setDocumentLoadState: (
    state: DocumentLoadState,
    progress?: number | null,
  ) => void;
  setDisplayUnit: (unit: PdfUnit) => void;
  upsertPageCrop: (
    pageIndex: number,
    patch: Partial<PageCropState>,
    options?: { commitHistory?: boolean },
  ) => void;
  setCropMode: (pageIndex: number, mode: CropMode) => void;
  setPresetConfig: (
    pageIndex: number,
    presetSizeId: string,
    presetAnchor: PresetAnchor,
  ) => void;
  setActiveDragState: (dragState: Partial<DragState>) => void;
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  setPreviewOpen: (open: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  setErrorMessage: (message: string | null) => void;
}

const createEmptyPageCrop = (pageIndex: number): PageCropState => ({
  pageIndex,
  cropRect: null,
  mode: "free",
  marginsPt: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  updatedAt: Date.now(),
});

const cloneHistorySnapshot = (
  pageCrops: Record<number, PageCropState>,
): HistorySnapshot => structuredClone(pageCrops);

const initialState = {
  file: null,
  fileName: null,
  fileBuffer: null,
  pageCount: 0,
  pages: [],
  currentPageIndex: 0,
  selectedPageIndices: [],
  zoom: 1,
  documentLoadState: "idle" as DocumentLoadState,
  documentLoadProgress: null as number | null,
  displayUnit: "mm" as PdfUnit,
  pageCrops: {},
  activeDragState: {
    pageIndex: null,
    action: null,
    handle: null,
  },
  previewOpen: false,
  exportDialogOpen: false,
  errorMessage: null,
  past: [] as HistorySnapshot[],
  future: [] as HistorySnapshot[],
};

export const usePdfStore = create<PdfStoreState>((set, get) => ({
  ...initialState,
  setDocument: ({ file, fileBuffer, fileName, pageCount = 0, pages = [] }) =>
    set({
      file,
      fileBuffer,
      fileName,
      pageCount,
      pages,
      currentPageIndex: 0,
      selectedPageIndices: [],
      documentLoadState: pageCount > 0 ? "ready" : "loading",
      documentLoadProgress: null,
      pageCrops: {},
      past: [],
      future: [],
      errorMessage: null,
    }),
  clearDocument: () => set({ ...initialState }),
  setPages: (pages) =>
    set({
      pages,
      pageCount: pages.length,
      selectedPageIndices: pages.length > 0 ? [0] : [],
      documentLoadState: pages.length > 0 ? "ready" : "idle",
      documentLoadProgress: null,
    }),
  setCurrentPage: (pageIndex) => set({ currentPageIndex: pageIndex }),
  toggleSelectedPage: (pageIndex, multiSelect = false) =>
    set((state) => {
      if (!multiSelect) {
        return {
          selectedPageIndices: [pageIndex],
          currentPageIndex: pageIndex,
        };
      }

      const exists = state.selectedPageIndices.includes(pageIndex);
      const selectedPageIndices = exists
        ? state.selectedPageIndices.filter((item) => item !== pageIndex)
        : [...state.selectedPageIndices, pageIndex].sort((a, b) => a - b);

      return {
        selectedPageIndices:
          selectedPageIndices.length > 0 ? selectedPageIndices : [pageIndex],
        currentPageIndex: pageIndex,
      };
    }),
  setZoom: (zoom) => set({ zoom }),
  setDocumentLoadState: (documentLoadState, documentLoadProgress = null) =>
    set({ documentLoadState, documentLoadProgress }),
  setDisplayUnit: (displayUnit) => set({ displayUnit }),
  upsertPageCrop: (pageIndex, patch, options) =>
    set((state) => {
      const current = state.pageCrops[pageIndex] ?? createEmptyPageCrop(pageIndex);
      const nextPageCrop: PageCropState = {
        ...current,
        ...patch,
        marginsPt: {
          ...current.marginsPt,
          ...patch.marginsPt,
        },
        cropRect: (patch.cropRect as CropRect | null | undefined) ?? current.cropRect,
        updatedAt: Date.now(),
      };

      const nextPast =
        options?.commitHistory === false
          ? state.past
          : [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT);

      return {
        pageCrops: {
          ...state.pageCrops,
          [pageIndex]: nextPageCrop,
        },
        past: nextPast,
        future: options?.commitHistory === false ? state.future : [],
      };
    }),
  setCropMode: (pageIndex, mode) =>
    get().upsertPageCrop(pageIndex, { mode }, { commitHistory: false }),
  setPresetConfig: (pageIndex, presetSizeId, presetAnchor) =>
    get().upsertPageCrop(
      pageIndex,
      { presetSizeId, presetAnchor, mode: "preset" },
      { commitHistory: false },
    ),
  setActiveDragState: (dragState) =>
    set((state) => ({
      activeDragState: {
        ...state.activeDragState,
        ...dragState,
      },
    })),
  commitHistory: () =>
    set((state) => ({
      past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
      future: [],
    })),
  undo: () =>
    set((state) => {
      if (state.past.length === 0) {
        return state;
      }

      const previous = state.past[state.past.length - 1];

      return {
        pageCrops: previous,
        past: state.past.slice(0, -1),
        future: [cloneHistorySnapshot(state.pageCrops), ...state.future].slice(
          0,
          HISTORY_LIMIT,
        ),
      };
    }),
  redo: () =>
    set((state) => {
      if (state.future.length === 0) {
        return state;
      }

      const [next, ...future] = state.future;

      return {
        pageCrops: next,
        future,
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
      };
    }),
  setPreviewOpen: (previewOpen) => set({ previewOpen }),
  setExportDialogOpen: (exportDialogOpen) => set({ exportDialogOpen }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
}));
