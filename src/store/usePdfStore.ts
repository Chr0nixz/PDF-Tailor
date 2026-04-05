import { create } from "zustand";
import { cropRectToMargins } from "@/utils/coordinates";
import type {
  CropHandle,
  CropInteraction,
  CropMode,
  CropRect,
  DocumentLoadState,
  PageCropState,
  PageMetadata,
  PdfUnit,
  PresetAnchor,
  SnapGuide,
} from "@/types";

const HISTORY_LIMIT = 50;

type HistorySnapshot = Record<number, PageCropState>;

interface DragState {
  pageIndex: number | null;
  action: CropInteraction | null;
  handle: CropHandle | null;
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
  draftCropRect: CropRect | null;
  activeSnapGuides: SnapGuide[];
  previewOpen: boolean;
  exportDialogOpen: boolean;
  exportInProgress: boolean;
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
  setPageCropRect: (
    pageIndex: number,
    cropRect: CropRect | null,
    options?: {
      commitHistory?: boolean;
      mode?: CropMode;
      presetSizeId?: string | null;
      presetAnchor?: PresetAnchor | null;
    },
  ) => void;
  setCropMode: (pageIndex: number, mode: CropMode) => void;
  setPresetConfig: (
    pageIndex: number,
    presetSizeId: string,
    presetAnchor: PresetAnchor,
  ) => void;
  beginCropInteraction: (
    pageIndex: number,
    action: CropInteraction,
    handle: CropHandle | null,
  ) => void;
  updateDraftCrop: (draftCropRect: CropRect | null, guides?: SnapGuide[]) => void;
  endCropInteraction: (commit: boolean) => void;
  clearCropInteraction: () => void;
  applyCropToPages: (sourcePageIndex: number, targetPageIndices: number[]) => void;
  pushHistoryCheckpoint: () => void;
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  setPreviewOpen: (open: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  setExportInProgress: (value: boolean) => void;
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
  draftCropRect: null as CropRect | null,
  activeSnapGuides: [] as SnapGuide[],
  previewOpen: false,
  exportDialogOpen: false,
  exportInProgress: false,
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
      draftCropRect: null,
      activeSnapGuides: [],
      past: [],
      future: [],
      exportInProgress: false,
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
  setPageCropRect: (pageIndex, cropRect, options) =>
    set((state) => {
      const current = state.pageCrops[pageIndex] ?? createEmptyPageCrop(pageIndex);
      const page = state.pages.find((item) => item.pageIndex === pageIndex);
      const nextPast =
        options?.commitHistory === false
          ? state.past
          : [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT);

      return {
        pageCrops: {
          ...state.pageCrops,
          [pageIndex]: {
            ...current,
            cropRect,
            marginsPt:
              page && cropRect
                ? cropRectToMargins(cropRect, page.widthPt, page.heightPt)
                : current.marginsPt,
            mode: options?.mode ?? current.mode,
            presetSizeId:
              options && "presetSizeId" in options
                ? options.presetSizeId ?? undefined
                : current.presetSizeId,
            presetAnchor:
              options && "presetAnchor" in options
                ? options.presetAnchor ?? undefined
                : current.presetAnchor,
            updatedAt: Date.now(),
          },
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
  beginCropInteraction: (pageIndex, action, handle) =>
    set((state) => ({
      activeDragState: {
        pageIndex,
        action,
        handle,
      },
      draftCropRect: state.pageCrops[pageIndex]?.cropRect ?? null,
      activeSnapGuides: [],
    })),
  updateDraftCrop: (draftCropRect, guides = []) =>
    set((state) => ({
      draftCropRect:
        state.activeDragState.pageIndex === draftCropRect?.pageIndex || draftCropRect === null
          ? draftCropRect
          : state.draftCropRect,
      activeSnapGuides: guides,
    })),
  endCropInteraction: (commit) =>
    set((state) => {
      const pageIndex = state.activeDragState.pageIndex;
      const nextState = {
        activeDragState: {
          pageIndex: null,
          action: null,
          handle: null,
        } satisfies DragState,
        draftCropRect: null,
        activeSnapGuides: [],
      };

      if (!commit || pageIndex === null || !state.draftCropRect) {
        return nextState;
      }

      const page = state.pages.find((item) => item.pageIndex === pageIndex);
      const current = state.pageCrops[pageIndex] ?? createEmptyPageCrop(pageIndex);
      const marginsPt = page
        ? cropRectToMargins(state.draftCropRect, page.widthPt, page.heightPt)
        : current.marginsPt;

      return {
        ...nextState,
        pageCrops: {
          ...state.pageCrops,
          [pageIndex]: {
            ...current,
            cropRect: state.draftCropRect,
            marginsPt,
            mode: "free",
            presetSizeId: undefined,
            presetAnchor: undefined,
            updatedAt: Date.now(),
          },
        },
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
        future: [],
      };
    }),
  clearCropInteraction: () =>
    set({
      activeDragState: {
        pageIndex: null,
        action: null,
        handle: null,
      },
      draftCropRect: null,
      activeSnapGuides: [],
    }),
  applyCropToPages: (sourcePageIndex, targetPageIndices) =>
    set((state) => {
      const source = state.pageCrops[sourcePageIndex];

      if (!source?.cropRect || targetPageIndices.length === 0) {
        return state;
      }

      const nextPageCrops = { ...state.pageCrops };

      for (const pageIndex of targetPageIndices) {
        const page = state.pages.find((item) => item.pageIndex === pageIndex);

        if (!page) {
          continue;
        }

        const nextCropRect: CropRect = {
          ...source.cropRect,
          pageIndex,
        };

        nextPageCrops[pageIndex] = {
          ...(state.pageCrops[pageIndex] ?? createEmptyPageCrop(pageIndex)),
          cropRect: nextCropRect,
          mode: source.mode,
          presetSizeId: source.presetSizeId,
          presetAnchor: source.presetAnchor,
          marginsPt: cropRectToMargins(nextCropRect, page.widthPt, page.heightPt),
          updatedAt: Date.now(),
        };
      }

      return {
        pageCrops: nextPageCrops,
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
        future: [],
      };
    }),
  pushHistoryCheckpoint: () =>
    set((state) => ({
      past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
      future: [],
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
        draftCropRect: null,
        activeSnapGuides: [],
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
        draftCropRect: null,
        activeSnapGuides: [],
      };
    }),
  setPreviewOpen: (previewOpen) => set({ previewOpen }),
  setExportDialogOpen: (exportDialogOpen) => set({ exportDialogOpen }),
  setExportInProgress: (exportInProgress) => set({ exportInProgress }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
}));
