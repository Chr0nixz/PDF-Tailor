import { create } from "zustand";
import i18n from "@/i18n/i18n";
import {
  createPresetCropRect,
  cropRectToMargins,
  marginsToCropRect,
} from "@/utils/coordinates";
import { findPaperSize } from "@/utils/paperSizes";
import {
  loadPersistedPreferences,
  savePersistedPreferences,
  type PersistedPreferences,
} from "@/utils/persistence";
import type {
  CropTemplate,
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
  selectionAnchorPageIndex: number | null;
  zoom: number;
  documentLoadState: DocumentLoadState;
  documentLoadProgress: number | null;
  displayUnit: PdfUnit;
  preferredPresetSizeId: string;
  preferredPresetAnchor: PresetAnchor;
  pageCrops: Record<number, PageCropState>;
  activeDragState: DragState;
  draftCropRect: CropRect | null;
  activeSnapGuides: SnapGuide[];
  clipboard: PageCropState | null;
  templates: CropTemplate[];
  selectedTemplateId: string | null;
  previewOpen: boolean;
  exportDialogOpen: boolean;
  exportInProgress: boolean;
  theme: "light" | "dark" | "system";
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  lastAction: string | null;
  lastUndoneAction: string | null;
  lastExportScope: "current" | "selected" | "all";
  lastExportMode: "crop-box" | "redraw";
  setDocument: (payload: {
    file: File;
    fileBuffer: Uint8Array;
    fileName: string;
    pageCount?: number;
    pages?: PageMetadata[];
  }) => void;
  clearDocument: () => void;
  setPages: (pages: PageMetadata[]) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  setCurrentPage: (pageIndex: number) => void;
  toggleSelectedPage: (
    pageIndex: number,
    multiSelect?: boolean,
    rangeSelect?: boolean,
  ) => void;
  setSelectedPages: (
    pageIndices: number[],
    options?: { currentPageIndex?: number; anchorPageIndex?: number | null },
  ) => void;
  setZoom: (zoom: number) => void;
  setDocumentLoadState: (
    state: DocumentLoadState,
    progress?: number | null,
  ) => void;
  setDisplayUnit: (unit: PdfUnit) => void;
  setPreferredPreset: (presetSizeId: string, presetAnchor: PresetAnchor) => void;
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
  setLastAction: (action: string | null) => void;
  setLastUndoneAction: (action: string | null) => void;
  setPreviewOpen: (open: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  setExportInProgress: (value: boolean) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setLastExportSettings: (scope: "current" | "selected" | "all", mode: "crop-box" | "redraw") => void;
  clearPageCrop: (pageIndex: number) => void;
  clearPageCrops: (pageIndices: number[]) => void;
  copyCrop: (pageIndex: number) => void;
  pasteCropToPages: (targetPageIndices: number[]) => void;
  saveTemplateFromPage: (
    pageIndex: number,
    name: string,
    templateId: string | null | undefined,
    defaultName: string,
  ) => string | null;
  selectTemplate: (templateId: string | null) => void;
  deleteTemplate: (templateId: string) => void;
  applyTemplateToPages: (templateId: string, targetPageIndices: number[]) => void;
  nudgeCrop: (pageIndex: number, dx: number, dy: number) => void;
  selectAllPages: () => void;
  goToPrevPage: () => void;
  goToNextPage: () => void;
  clearDraftCrop: () => void;
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

const persistedPreferences = loadPersistedPreferences();

const initialState = {
  file: null,
  fileName: null,
  fileBuffer: null,
  pageCount: 0,
  pages: [],
  currentPageIndex: 0,
  selectedPageIndices: [],
  selectionAnchorPageIndex: null as number | null,
  zoom: 1,
  documentLoadState: "idle" as DocumentLoadState,
  documentLoadProgress: null as number | null,
  displayUnit: "mm" as PdfUnit,
  preferredPresetSizeId: "a4",
  preferredPresetAnchor: "center" as PresetAnchor,
  pageCrops: {},
  activeDragState: {
    pageIndex: null,
    action: null,
    handle: null,
  },
  draftCropRect: null as CropRect | null,
  activeSnapGuides: [] as SnapGuide[],
  clipboard: null as PageCropState | null,
  templates: [] as CropTemplate[],
  selectedTemplateId: null as string | null,
  previewOpen: false,
  exportDialogOpen: false,
  exportInProgress: false,
  theme: "system" as "light" | "dark" | "system",
  past: [] as HistorySnapshot[],
  future: [] as HistorySnapshot[],
  lastAction: null as string | null,
  lastUndoneAction: null as string | null,
  lastExportScope: persistedPreferences.lastExportScope ?? "all",
  lastExportMode: persistedPreferences.lastExportMode ?? "crop-box",
};

function createTemplateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildTemplateName(
  name: string,
  templates: CropTemplate[],
  templateId: string | null | undefined,
  defaultName: string,
) {
  const trimmed = name.trim();
  if (trimmed) {
    return trimmed;
  }

  const existingCount = templates.filter((template) => template.id !== templateId).length;
  return `${defaultName} ${existingCount + 1}`;
}

function persistPreferences(state: Pick<
  PdfStoreState,
  | "displayUnit"
  | "zoom"
  | "preferredPresetSizeId"
  | "preferredPresetAnchor"
  | "templates"
  | "selectedTemplateId"
  | "theme"
  | "lastExportScope"
  | "lastExportMode"
>) {
  const snapshot: PersistedPreferences = {
    displayUnit: state.displayUnit,
    zoom: state.zoom,
    preferredPresetSizeId: state.preferredPresetSizeId,
    preferredPresetAnchor: state.preferredPresetAnchor,
    templates: state.templates,
    selectedTemplateId: state.selectedTemplateId,
    theme: state.theme,
    lastExportScope: state.lastExportScope,
    lastExportMode: state.lastExportMode,
  };

  savePersistedPreferences(snapshot);
}

function buildTemplateFromPageCrop(
  name: string,
  page: PageMetadata,
  pageCrop: PageCropState,
  templateId?: string | null,
): CropTemplate | null {
  if (!pageCrop.cropRect) {
    return null;
  }

  const now = Date.now();

  return {
    id: templateId ?? createTemplateId(),
    name,
    mode: pageCrop.mode,
    presetSizeId: pageCrop.presetSizeId,
    presetAnchor: pageCrop.presetAnchor,
    marginsRatio: {
      top: page.heightPt > 0 ? pageCrop.marginsPt.top / page.heightPt : 0,
      right: page.widthPt > 0 ? pageCrop.marginsPt.right / page.widthPt : 0,
      bottom: page.heightPt > 0 ? pageCrop.marginsPt.bottom / page.heightPt : 0,
      left: page.widthPt > 0 ? pageCrop.marginsPt.left / page.widthPt : 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function applyTemplateToPage(
  template: CropTemplate,
  page: PageMetadata,
): PageCropState {
  const presetSize = template.presetSizeId ? findPaperSize(template.presetSizeId) : null;
  const nextCropRect =
    template.mode === "preset" && presetSize
      ? createPresetCropRect(
          presetSize,
          page.widthPt,
          page.heightPt,
          page.pageIndex,
          template.presetAnchor ?? "center",
        )
      : marginsToCropRect(
          {
            top: template.marginsRatio.top * page.heightPt,
            right: template.marginsRatio.right * page.widthPt,
            bottom: template.marginsRatio.bottom * page.heightPt,
            left: template.marginsRatio.left * page.widthPt,
          },
          page.widthPt,
          page.heightPt,
          page.pageIndex,
        );

  return {
    pageIndex: page.pageIndex,
    cropRect: nextCropRect,
    mode: template.mode,
    presetSizeId: template.mode === "preset" ? template.presetSizeId : undefined,
    presetAnchor: template.mode === "preset" ? template.presetAnchor : undefined,
    marginsPt: cropRectToMargins(nextCropRect, page.widthPt, page.heightPt),
    updatedAt: Date.now(),
  };
}

function normalizePageSelection(pageIndices: number[], pageCount: number) {
  const uniqueSorted = [...new Set(pageIndices)]
    .filter((pageIndex) => pageIndex >= 0 && pageIndex < pageCount)
    .sort((left, right) => left - right);

  return uniqueSorted;
}

function buildRangeSelection(start: number, end: number) {
  const rangeStart = Math.min(start, end);
  const rangeEnd = Math.max(start, end);

  return Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) => rangeStart + index);
}

export const usePdfStore = create<PdfStoreState>((set, get) => ({
  ...persistedPreferences,
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
      selectionAnchorPageIndex: null,
      documentLoadState: pageCount > 0 ? "ready" : "loading",
      documentLoadProgress: null,
      pageCrops: {},
      draftCropRect: null,
      activeSnapGuides: [],
      past: [],
      future: [],
      exportInProgress: false,
    }),
  clearDocument: () =>
    set((state) => ({
      ...initialState,
      displayUnit: state.displayUnit,
      zoom: state.zoom,
      preferredPresetSizeId: state.preferredPresetSizeId,
      preferredPresetAnchor: state.preferredPresetAnchor,
      templates: state.templates,
      selectedTemplateId: state.selectedTemplateId,
    })),
  setPages: (pages) =>
    set({
      pages,
      pageCount: pages.length,
      selectedPageIndices: pages.length > 0 ? [0] : [],
      selectionAnchorPageIndex: pages.length > 0 ? 0 : null,
      documentLoadState: pages.length > 0 ? "ready" : "idle",
      documentLoadProgress: null,
    }),
  reorderPages: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex === toIndex) {
        return state;
      }
      const newPages = [...state.pages];
      const [moved] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, moved);
      return { pages: newPages };
    }),
  setCurrentPage: (pageIndex) =>
    set({
      currentPageIndex: pageIndex,
      selectionAnchorPageIndex: pageIndex,
    }),
  toggleSelectedPage: (pageIndex, multiSelect = false, rangeSelect = false) =>
    set((state) => {
      if (rangeSelect) {
        const anchor = state.selectionAnchorPageIndex ?? state.currentPageIndex ?? pageIndex;
        return {
          selectedPageIndices: buildRangeSelection(anchor, pageIndex),
          currentPageIndex: pageIndex,
          selectionAnchorPageIndex: anchor,
        };
      }

      if (!multiSelect) {
        return {
          selectedPageIndices: [pageIndex],
          currentPageIndex: pageIndex,
          selectionAnchorPageIndex: pageIndex,
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
        selectionAnchorPageIndex: pageIndex,
      };
    }),
  setSelectedPages: (pageIndices, options) =>
    set((state) => {
      const selectedPageIndices = normalizePageSelection(pageIndices, state.pageCount);
      const fallbackCurrentPageIndex =
        selectedPageIndices.at(-1) ?? Math.min(state.currentPageIndex, Math.max(0, state.pageCount - 1));
      const currentPageIndex =
        options?.currentPageIndex !== undefined
          ? options.currentPageIndex
          : fallbackCurrentPageIndex;

      return {
        selectedPageIndices,
        currentPageIndex,
        selectionAnchorPageIndex:
          options?.anchorPageIndex !== undefined
            ? options.anchorPageIndex
            : selectedPageIndices[0] ?? null,
      };
    }),
  setZoom: (zoom) => {
    const nextZoom = Math.max(0.25, Math.min(3, zoom));
    set({ zoom: nextZoom });
    persistPreferences(get());
  },
  setDocumentLoadState: (documentLoadState, documentLoadProgress = null) =>
    set({ documentLoadState, documentLoadProgress }),
  setDisplayUnit: (displayUnit) => {
    set({ displayUnit });
    persistPreferences(get());
  },
  setPreferredPreset: (preferredPresetSizeId, preferredPresetAnchor) => {
    set({ preferredPresetSizeId, preferredPresetAnchor });
    persistPreferences(get());
  },
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
  setPresetConfig: (pageIndex, presetSizeId, presetAnchor) => {
    get().upsertPageCrop(
      pageIndex,
      { presetSizeId, presetAnchor, mode: "preset" },
      { commitHistory: false },
    );
    set({ preferredPresetSizeId: presetSizeId, preferredPresetAnchor: presetAnchor });
    persistPreferences(get());
  },
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
        lastAction: i18n.t("history.action.cropAdjust") as string,
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
        lastAction: i18n.t("history.action.batchApply") as string,
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
        lastAction: state.lastAction,
        lastUndoneAction: state.lastAction,
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
        lastAction: state.lastAction,
        lastUndoneAction: state.lastAction,
      };
    }),
  setLastAction: (action) => set({ lastAction: action }),
  setLastUndoneAction: (action) => set({ lastUndoneAction: action }),
  setPreviewOpen: (previewOpen) => set({ previewOpen }),
  setExportDialogOpen: (exportDialogOpen) => set({ exportDialogOpen }),
  setExportInProgress: (exportInProgress) => set({ exportInProgress }),
  setTheme: (theme) => {
    set({ theme });
    persistPreferences(get());
  },
  setLastExportSettings: (scope, mode) => {
    set({ lastExportScope: scope, lastExportMode: mode });
    persistPreferences(get());
  },
  clearPageCrop: (pageIndex) =>
    set((state) => {
      const current = state.pageCrops[pageIndex];
      if (!current?.cropRect) {
        return state;
      }

      const nextPageCrops = { ...state.pageCrops };
      delete nextPageCrops[pageIndex];

      return {
        pageCrops: nextPageCrops,
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
        future: [],
        lastAction: i18n.t("history.action.clear") as string,
      };
    }),
  clearPageCrops: (pageIndices) =>
    set((state) => {
      const targets = new Set(pageIndices);
      if (targets.size === 0) {
        return state;
      }

      const nextPageCrops = { ...state.pageCrops };
      let changed = false;

      for (const pageIndex of targets) {
        if (nextPageCrops[pageIndex]?.cropRect) {
          delete nextPageCrops[pageIndex];
          changed = true;
        }
      }

      if (!changed) {
        return state;
      }

      return {
        pageCrops: nextPageCrops,
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
        future: [],
        lastAction: i18n.t("history.action.clear") as string,
      };
    }),
  copyCrop: (pageIndex) =>
    set((state) => {
      const current = state.pageCrops[pageIndex];
      if (!current?.cropRect) {
        return state;
      }
      return { clipboard: structuredClone(current) };
    }),
  pasteCropToPages: (targetPageIndices) =>
    set((state) => {
      const { clipboard } = state;
      if (!clipboard?.cropRect || targetPageIndices.length === 0) {
        return state;
      }

      const nextPageCrops = { ...state.pageCrops };

      for (const pageIndex of targetPageIndices) {
        const page = state.pages.find((item) => item.pageIndex === pageIndex);
        if (!page) continue;

        const sourceRect = clipboard.cropRect!;
        const sourcePage = state.pages.find(
          (item) => item.pageIndex === clipboard.pageIndex,
        );

        let nextCropRect: CropRect;
        if (sourcePage) {
          const scaleX = page.widthPt / sourcePage.widthPt;
          const scaleY = page.heightPt / sourcePage.heightPt;

          nextCropRect = {
            pageIndex,
            x: sourceRect.x * scaleX,
            y: sourceRect.y * scaleY,
            width: sourceRect.width * scaleX,
            height: sourceRect.height * scaleY,
          };
        } else {
          nextCropRect = {
            ...sourceRect,
            pageIndex,
          };
        }

        nextPageCrops[pageIndex] = {
          ...(state.pageCrops[pageIndex] ?? createEmptyPageCrop(pageIndex)),
          cropRect: nextCropRect,
          mode: clipboard.mode,
          presetSizeId: clipboard.presetSizeId,
          presetAnchor: clipboard.presetAnchor,
          marginsPt: cropRectToMargins(nextCropRect, page.widthPt, page.heightPt),
          updatedAt: Date.now(),
        };
      }

      return {
        pageCrops: nextPageCrops,
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
        future: [],
        lastAction: i18n.t("history.action.paste") as string,
      };
    }),
  saveTemplateFromPage: (pageIndex, name, templateId = null, defaultName) => {
    const state = get();
    const page = state.pages.find((item) => item.pageIndex === pageIndex);
    const pageCrop = state.pageCrops[pageIndex];

    if (!page || !pageCrop?.cropRect) {
      return null;
    }

    const nextTemplateName = buildTemplateName(name, state.templates, templateId, defaultName);
    const baseTemplate = buildTemplateFromPageCrop(
      nextTemplateName,
      page,
      pageCrop,
      templateId,
    );

    if (!baseTemplate) {
      return null;
    }

    const previousTemplate = templateId
      ? state.templates.find((template) => template.id === templateId)
      : null;
    const nextTemplate: CropTemplate = previousTemplate
      ? {
          ...baseTemplate,
          id: previousTemplate.id,
          createdAt: previousTemplate.createdAt,
          updatedAt: Date.now(),
        }
      : baseTemplate;
    const nextTemplates = previousTemplate
      ? state.templates.map((template) =>
          template.id === previousTemplate.id ? nextTemplate : template,
        )
      : [...state.templates, nextTemplate];

    set({
      templates: nextTemplates,
      selectedTemplateId: nextTemplate.id,
    });
    persistPreferences(get());
    return nextTemplate.id;
  },
  selectTemplate: (selectedTemplateId) => {
    set((state) => ({
      selectedTemplateId:
        selectedTemplateId && state.templates.some((template) => template.id === selectedTemplateId)
          ? selectedTemplateId
          : null,
    }));
    persistPreferences(get());
  },
  deleteTemplate: (templateId) => {
    set((state) => ({
      templates: state.templates.filter((template) => template.id !== templateId),
      selectedTemplateId: state.selectedTemplateId === templateId ? null : state.selectedTemplateId,
    }));
    persistPreferences(get());
  },
  applyTemplateToPages: (templateId, targetPageIndices) => {
    set((state) => {
      const template = state.templates.find((item) => item.id === templateId);

      if (!template || targetPageIndices.length === 0) {
        return state;
      }

      const nextPageCrops = { ...state.pageCrops };

      for (const pageIndex of targetPageIndices) {
        const page = state.pages.find((item) => item.pageIndex === pageIndex);
        if (!page) {
          continue;
        }

        nextPageCrops[pageIndex] = {
          ...(state.pageCrops[pageIndex] ?? createEmptyPageCrop(pageIndex)),
          ...applyTemplateToPage(template, page),
        };
      }

      return {
        pageCrops: nextPageCrops,
        selectedTemplateId: template.id,
        preferredPresetSizeId: template.presetSizeId ?? state.preferredPresetSizeId,
        preferredPresetAnchor: template.presetAnchor ?? state.preferredPresetAnchor,
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
        future: [],
        lastAction: i18n.t("history.action.templateApply") as string,
      };
    });
    persistPreferences(get());
  },
  nudgeCrop: (pageIndex, dx, dy) =>
    set((state) => {
      const current = state.pageCrops[pageIndex];
      if (!current?.cropRect) {
        return state;
      }

      const page = state.pages.find((item) => item.pageIndex === pageIndex);
      if (!page) return state;

      const rect = current.cropRect;
      const clamped = clampCropRect(
        {
          pageIndex,
          x: rect.x + dx,
          y: rect.y - dy, // PDF y goes bottom-to-top, invert dy for screen intuition
          width: rect.width,
          height: rect.height,
        },
        page.widthPt,
        page.heightPt,
      );

      const marginsPt = cropRectToMargins(clamped, page.widthPt, page.heightPt);

      return {
        pageCrops: {
          ...state.pageCrops,
          [pageIndex]: {
            ...current,
            cropRect: clamped,
            marginsPt,
            mode: "free" as CropMode,
            presetSizeId: undefined,
            presetAnchor: undefined,
            updatedAt: Date.now(),
          },
        },
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
        future: [],
        lastAction: i18n.t("history.action.nudge") as string,
      };
    }),
  selectAllPages: () =>
    set((state) => ({
      selectedPageIndices: Array.from({ length: state.pageCount }, (_, i) => i),
      selectionAnchorPageIndex: state.pageCount > 0 ? 0 : null,
    })),
  goToPrevPage: () =>
    set((state) => ({
      currentPageIndex: Math.max(0, state.currentPageIndex - 1),
      selectedPageIndices: [Math.max(0, state.currentPageIndex - 1)],
      selectionAnchorPageIndex: Math.max(0, state.currentPageIndex - 1),
    })),
  goToNextPage: () =>
    set((state) => ({
      currentPageIndex: Math.min(state.pageCount - 1, state.currentPageIndex + 1),
      selectedPageIndices: [Math.min(state.pageCount - 1, state.currentPageIndex + 1)],
      selectionAnchorPageIndex: Math.min(state.pageCount - 1, state.currentPageIndex + 1),
    })),
  clearDraftCrop: () =>
    set({
      activeDragState: {
        pageIndex: null,
        action: null,
        handle: null,
      },
      draftCropRect: null,
      activeSnapGuides: [],
    }),
}));

function clampCropRect(
  rect: CropRect,
  pageWidthPt: number,
  pageHeightPt: number,
): CropRect {
  const minSize = 12;
  const x = Math.max(0, Math.min(rect.x, pageWidthPt - minSize));
  const y = Math.max(0, Math.min(rect.y, pageHeightPt - minSize));
  const width = Math.max(minSize, Math.min(rect.width, pageWidthPt - x));
  const height = Math.max(minSize, Math.min(rect.height, pageHeightPt - y));
  return { ...rect, x, y, width, height };
}
