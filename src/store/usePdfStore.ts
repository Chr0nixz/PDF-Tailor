import { create } from "zustand";
import i18n from "@/i18n/i18n";
import type { KeyBinding } from "@/hooks/useKeyBindings";
import {
  createPresetCropRect,
  cropRectToMargins,
  marginsToCropRect,
  mirrorMargins,
} from "@/utils/coordinates";
import { findPaperSize } from "@/utils/paperSizes";
import { normalizeRotation } from "@/utils/documentWarnings";
import {
  loadPersistedPreferences,
  savePersistedPreferences,
  type PersistedPreferences,
  type RecentFile,
  MAX_RECENT_FILES,
} from "@/utils/persistence";
import type {
  ColumnSplitConfig,
  CropTemplate,
  CropHandle,
  CropInteraction,
  CropMode,
  CropRect,
  DocumentLoadState,
  PageCropState,
  PageMetadata,
  PdfTailorSession,
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
  printPreviewOpen: boolean;
  exportDialogOpen: boolean;
  shortcutSettingsOpen: boolean;
  exportInProgress: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  sidebarWidth: number;
  propertiesPanelWidth: number;
  sidebarCollapsed: boolean;
  propertiesPanelCollapsed: boolean;
  themeName: "paper" | "midnight" | "warm" | "high-contrast";
  viewMode: "crop" | "split";
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  lastAction: string | null;
  lastUndoneAction: string | null;
  lastExportScope: "current" | "selected" | "all";
  lastExportMode: "crop-box" | "redraw";
  keyBindings: KeyBinding[] | null;
  recentFiles: RecentFile[];
  setRecentFiles: (files: RecentFile[]) => void;
  addRecentFile: (file: RecentFile) => void;
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
  rotatePage: (pageIndex: number, degrees: number) => void;
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
  mirrorMarginsEnabled: boolean;
  setMirrorMarginsEnabled: (enabled: boolean) => void;
  setPageSplitConfig: (pageIndex: number, config: ColumnSplitConfig | undefined) => void;
  applySplitConfigToPages: (
    config: ColumnSplitConfig | undefined,
    targetPageIndices: number[],
  ) => void;
  applyCropToPages: (
    sourcePageIndex: number,
    targetPageIndices: number[],
    options?: { mirrorMargins?: boolean },
  ) => void;
  pushHistoryCheckpoint: () => void;
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  setLastAction: (action: string | null) => void;
  setLastUndoneAction: (action: string | null) => void;
  setPreviewOpen: (open: boolean) => void;
  setPrintPreviewOpen: (open: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  setShortcutSettingsOpen: (open: boolean) => void;
  setViewMode: (viewMode: "crop" | "split") => void;
  setSidebarWidth: (width: number) => void;
  setPropertiesPanelWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPropertiesPanelCollapsed: (collapsed: boolean) => void;
  setExportInProgress: (value: boolean) => void;
  setOnboardingCompleted: (value: boolean) => void;
  setOnboardingStep: (step: number) => void;
  setThemeName: (themeName: "paper" | "midnight" | "warm" | "high-contrast") => void;
  setLastExportSettings: (scope: "current" | "selected" | "all", mode: "crop-box" | "redraw") => void;
  setKeyBindings: (bindings: KeyBinding[] | null) => void;
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
  restoreOriginalOrder: () => void;
  isOrderModified: () => boolean;
  loadSession: (session: PdfTailorSession) => void;
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
  printPreviewOpen: false,
  exportDialogOpen: false,
  shortcutSettingsOpen: false,
  exportInProgress: false,
  onboardingCompleted: persistedPreferences.onboardingCompleted ?? false,
  onboardingStep: persistedPreferences.onboardingStep ?? 0,
  themeName: persistedPreferences.themeName ?? "paper",
  past: [] as HistorySnapshot[],
  future: [] as HistorySnapshot[],
  lastAction: null as string | null,
  lastUndoneAction: null as string | null,
  lastExportScope: persistedPreferences.lastExportScope ?? "all",
  lastExportMode: persistedPreferences.lastExportMode ?? "crop-box",
  keyBindings: persistedPreferences.keyBindings ?? null,
  recentFiles: persistedPreferences.recentFiles ?? [],
  sidebarWidth: persistedPreferences.sidebarWidth ?? 280,
  propertiesPanelWidth: persistedPreferences.propertiesPanelWidth ?? 320,
  sidebarCollapsed: persistedPreferences.sidebarCollapsed ?? false,
  propertiesPanelCollapsed: persistedPreferences.propertiesPanelCollapsed ?? false,
  mirrorMarginsEnabled: persistedPreferences.mirrorMarginsEnabled ?? false,
  viewMode: "crop" as "crop" | "split",
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
  | "themeName"
  | "lastExportScope"
  | "lastExportMode"
  | "onboardingCompleted"
  | "onboardingStep"
  | "keyBindings"
  | "sidebarWidth"
  | "propertiesPanelWidth"
  | "sidebarCollapsed"
  | "propertiesPanelCollapsed"
  | "mirrorMarginsEnabled"
  | "recentFiles"
>) {
  const snapshot: PersistedPreferences = {
    displayUnit: state.displayUnit,
    zoom: state.zoom,
    preferredPresetSizeId: state.preferredPresetSizeId,
    preferredPresetAnchor: state.preferredPresetAnchor,
    templates: state.templates,
    selectedTemplateId: state.selectedTemplateId,
    themeName: state.themeName,
    lastExportScope: state.lastExportScope,
    lastExportMode: state.lastExportMode,
    onboardingCompleted: state.onboardingCompleted,
    onboardingStep: state.onboardingStep,
    keyBindings: state.keyBindings,
    sidebarWidth: state.sidebarWidth,
    propertiesPanelWidth: state.propertiesPanelWidth,
    sidebarCollapsed: state.sidebarCollapsed,
    propertiesPanelCollapsed: state.propertiesPanelCollapsed,
    mirrorMarginsEnabled: state.mirrorMarginsEnabled,
    recentFiles: state.recentFiles,
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
    splitConfig: pageCrop.splitConfig ? { ...pageCrop.splitConfig } : undefined,
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
    splitConfig: template.splitConfig ? { ...template.splitConfig } : undefined,
    updatedAt: Date.now(),
  };
}

function resolvePageByStoreId(stableId: number, pages: PageMetadata[]): PageMetadata | undefined {
  return pages.find(
    (p) => p.sourceId === stableId || p.pageIndex === stableId,
  );
}

/** Convert a stable sourceId to its current array index in pages[]. */
function sourceIdToDisplayIndex(sourceId: number, pages: PageMetadata[]): number {
  const idx = pages.findIndex((p) => p.sourceId === sourceId);
  return idx >= 0 ? idx : sourceId;
}

/** Convert all sourceIds to current array indices (for selectedPageIndices). */
function sourceIdsToArrayIds(sourceIds: number[], pages: PageMetadata[]): number[] {
  return sourceIds.map((sid) => sourceIdToDisplayIndex(sid, pages)).filter((i) => i >= 0 && i < pages.length);
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
      onboardingCompleted: state.onboardingCompleted,
      onboardingStep: state.onboardingStep,
    })),
  setPages: (pages) =>
    set({
      pages,
      pageCount: pages.length,
      selectedPageIndices: pages.length > 0 ? [pages[0].sourceId] : [],
      selectionAnchorPageIndex: pages.length > 0 ? pages[0].sourceId : null,
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
    set((state) => {
      const page = state.pages[pageIndex] ?? resolvePageByStoreId(pageIndex, state.pages);
      const displayIndex = page ? state.pages.indexOf(page) : pageIndex;
      return {
        currentPageIndex: displayIndex >= 0 ? displayIndex : pageIndex,
        selectionAnchorPageIndex: page ? page.sourceId : pageIndex,
      };
    }),
  rotatePage: (pageIndex, degrees) =>
    set((state) => {
      const page = resolvePageByStoreId(pageIndex, state.pages);
      if (!page) return {};
      const newUserRotation = normalizeRotation(page.userRotation + degrees);
      const newPages = state.pages.map((p) =>
        (p.sourceId === page.sourceId || p.pageIndex === page.sourceId)
          ? { ...p, userRotation: newUserRotation }
          : p,
      );
      return { pages: newPages };
    }),
  toggleSelectedPage: (pageIdentifier, multiSelect = false, rangeSelect = false) =>
    set((state) => {
      const page =
        resolvePageByStoreId(pageIdentifier, state.pages) ??
        state.pages[pageIdentifier];
      if (!page) return state;

      const sourceId = page.sourceId;
      const displayIndex = state.pages.findIndex((p) => p.sourceId === sourceId);
      const targetDisplayIndex = displayIndex >= 0 ? displayIndex : 0;

      if (rangeSelect) {
        const anchorSourceId = state.selectionAnchorPageIndex ?? sourceId;
        const anchorDispIdx = state.pages.findIndex(
          (p) => p.sourceId === anchorSourceId,
        );
        const startDisp = Math.min(
          anchorDispIdx >= 0 ? anchorDispIdx : targetDisplayIndex,
          targetDisplayIndex,
        );
        const endDisp = Math.max(
          anchorDispIdx >= 0 ? anchorDispIdx : targetDisplayIndex,
          targetDisplayIndex,
        );
        const rangeSourceIds = state.pages
          .slice(startDisp, endDisp + 1)
          .map((p) => p.sourceId);

        return {
          selectedPageIndices: rangeSourceIds,
          currentPageIndex: targetDisplayIndex,
          selectionAnchorPageIndex: anchorSourceId,
        };
      }

      if (!multiSelect) {
        return {
          selectedPageIndices: [sourceId],
          currentPageIndex: targetDisplayIndex,
          selectionAnchorPageIndex: sourceId,
        };
      }

      const exists = state.selectedPageIndices.includes(sourceId);
      const nextSelected = exists
        ? state.selectedPageIndices.filter((item) => item !== sourceId)
        : [...state.selectedPageIndices, sourceId].sort((a, b) => a - b);

      return {
        selectedPageIndices:
          nextSelected.length > 0 ? nextSelected : [sourceId],
        currentPageIndex: targetDisplayIndex,
        selectionAnchorPageIndex: sourceId,
      };
    }),
  setSelectedPages: (pageIndices, options) =>
    set((state) => {
      const selectedPageIndices = normalizePageSelection(pageIndices, state.pageCount);
      let currentPageIndex: number;
      if (options?.currentPageIndex !== undefined) {
        currentPageIndex = options.currentPageIndex;
      } else if (selectedPageIndices.length > 0) {
        const lastSelectedSourceId = selectedPageIndices.at(-1);
        const dispIdx = state.pages.findIndex(
          (p) => p.sourceId === lastSelectedSourceId,
        );
        currentPageIndex =
          dispIdx >= 0
            ? dispIdx
            : Math.min(state.currentPageIndex, Math.max(0, state.pageCount - 1));
      } else {
        currentPageIndex = Math.min(
          state.currentPageIndex,
          Math.max(0, state.pageCount - 1),
        );
      }

      return {
        selectedPageIndices,
        currentPageIndex,
        selectionAnchorPageIndex:
          options?.anchorPageIndex !== undefined
            ? options.anchorPageIndex
            : (selectedPageIndices[0] ?? null),
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
      const page = resolvePageByStoreId(pageIndex, state.pages);
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

      const page = resolvePageByStoreId(pageIndex, state.pages);
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
  setMirrorMarginsEnabled: (mirrorMarginsEnabled) => {
    set({ mirrorMarginsEnabled });
    persistPreferences(get());
  },
  applyCropToPages: (sourcePageIndex, targetPageIndices, options) =>
    set((state) => {
      const sourcePage = resolvePageByStoreId(sourcePageIndex, state.pages);
      const source = state.pageCrops[sourcePage?.sourceId ?? sourcePageIndex];

      if (!source?.cropRect || targetPageIndices.length === 0 || !sourcePage) {
        return state;
      }

      const sourceDisplayIdx = state.pages.findIndex(
        (p) => p.sourceId === sourcePage.sourceId,
      );
      const isSourceOdd =
        (sourceDisplayIdx >= 0 ? sourceDisplayIdx : sourcePage.sourceId) % 2 === 0;
      const shouldMirror = options?.mirrorMargins ?? state.mirrorMarginsEnabled;

      const nextPageCrops = { ...state.pageCrops };

      for (const pageIndex of targetPageIndices) {
        const page = resolvePageByStoreId(pageIndex, state.pages);

        if (!page) {
          continue;
        }

        const targetSourceId = page.sourceId;
        const targetDisplayIdx = state.pages.findIndex(
          (p) => p.sourceId === targetSourceId,
        );
        const isTargetOdd =
          (targetDisplayIdx >= 0 ? targetDisplayIdx : targetSourceId) % 2 === 0;
        const needsMirror = shouldMirror && isSourceOdd !== isTargetOdd;

        let nextCropRect: CropRect;
        let nextMargins = source.marginsPt;

        if (needsMirror) {
          nextMargins = mirrorMargins(source.marginsPt);
          nextCropRect = marginsToCropRect(
            nextMargins,
            page.widthPt,
            page.heightPt,
            targetSourceId,
          );
        } else if (
          page.widthPt === sourcePage.widthPt &&
          page.heightPt === sourcePage.heightPt
        ) {
          nextCropRect = {
            ...source.cropRect,
            pageIndex: targetSourceId,
          };
        } else {
          nextCropRect = marginsToCropRect(
            source.marginsPt,
            page.widthPt,
            page.heightPt,
            targetSourceId,
          );
        }

        nextPageCrops[targetSourceId] = {
          ...(state.pageCrops[targetSourceId] ?? createEmptyPageCrop(targetSourceId)),
          cropRect: nextCropRect,
          mode: source.mode,
          presetSizeId: source.presetSizeId,
          presetAnchor: source.presetAnchor,
          marginsPt: nextMargins,
          splitConfig: source.splitConfig,
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
  setPageSplitConfig: (pageIndex, config) =>
    set((state) => {
      const page = resolvePageByStoreId(pageIndex, state.pages);
      const targetSourceId = page?.sourceId ?? pageIndex;
      const current = state.pageCrops[targetSourceId] ?? createEmptyPageCrop(targetSourceId);

      const nextPageCrops = {
        ...state.pageCrops,
        [targetSourceId]: {
          ...current,
          splitConfig: config,
          updatedAt: Date.now(),
        },
      };

      return {
        pageCrops: nextPageCrops,
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
        future: [],
        lastAction: i18n.t("history.action.splitConfig") as string,
      };
    }),
  applySplitConfigToPages: (config, targetPageIndices) =>
    set((state) => {
      const nextPageCrops = { ...state.pageCrops };
      for (const pageIndex of targetPageIndices) {
        const page = resolvePageByStoreId(pageIndex, state.pages);
        if (!page) continue;
        const targetSourceId = page.sourceId;
        const current = state.pageCrops[targetSourceId] ?? createEmptyPageCrop(targetSourceId);

        nextPageCrops[targetSourceId] = {
          ...current,
          splitConfig: config,
          updatedAt: Date.now(),
        };
      }

      return {
        pageCrops: nextPageCrops,
        past: [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT),
        future: [],
        lastAction: i18n.t("history.action.splitConfig") as string,
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
  setPrintPreviewOpen: (printPreviewOpen) => set({ printPreviewOpen }),
  setExportDialogOpen: (exportDialogOpen) => set({ exportDialogOpen }),
  setShortcutSettingsOpen: (shortcutSettingsOpen) => set({ shortcutSettingsOpen }),
  setViewMode: (viewMode: "crop" | "split") => set({ viewMode }),
  setSidebarWidth: (width) => {
    set({ sidebarWidth: Math.max(200, Math.min(500, width)) });
    persistPreferences(get());
  },
  setPropertiesPanelWidth: (width) => {
    set({ propertiesPanelWidth: Math.max(240, Math.min(480, width)) });
    persistPreferences(get());
  },
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    persistPreferences(get());
  },
  setPropertiesPanelCollapsed: (collapsed) => {
    set({ propertiesPanelCollapsed: collapsed });
    persistPreferences(get());
  },
  setExportInProgress: (exportInProgress) => set({ exportInProgress }),
  setOnboardingCompleted: (onboardingCompleted) => {
    set({ onboardingCompleted });
    persistPreferences(get());
  },
  setOnboardingStep: (onboardingStep) => {
    set({ onboardingStep: Math.max(0, onboardingStep) });
    persistPreferences(get());
  },
  setThemeName: (themeName) => {
    set({ themeName });
    persistPreferences(get());
  },
  setLastExportSettings: (scope, mode) => {
    set({ lastExportScope: scope, lastExportMode: mode });
    persistPreferences(get());
  },
  setKeyBindings: (bindings) => {
    set({ keyBindings: bindings });
    persistPreferences(get());
  },
  setRecentFiles: (recentFiles) => {
    set({ recentFiles });
    persistPreferences(get());
  },
  addRecentFile: (file) => {
    set((state) => {
      const filtered = state.recentFiles.filter((f) => f.path !== file.path);
      const next = [file, ...filtered].slice(0, MAX_RECENT_FILES);
      return { recentFiles: next };
    });
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
      const page = resolvePageByStoreId(pageIndex, state.pages);
      const sourceId = page?.sourceId ?? pageIndex;
      const current = state.pageCrops[sourceId] ?? state.pageCrops[pageIndex];
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
        const page = resolvePageByStoreId(pageIndex, state.pages);
        if (!page) continue;

        const targetSourceId = page.sourceId;
        const sourceRect = clipboard.cropRect!;
        const sourcePage = resolvePageByStoreId(clipboard.pageIndex, state.pages);

        let nextCropRect: CropRect;
        if (sourcePage) {
          const scaleX = page.widthPt / sourcePage.widthPt;
          const scaleY = page.heightPt / sourcePage.heightPt;

          nextCropRect = {
            pageIndex: targetSourceId,
            x: sourceRect.x * scaleX,
            y: sourceRect.y * scaleY,
            width: sourceRect.width * scaleX,
            height: sourceRect.height * scaleY,
          };
        } else {
          nextCropRect = {
            ...sourceRect,
            pageIndex: targetSourceId,
          };
        }

        nextPageCrops[targetSourceId] = {
          ...(state.pageCrops[targetSourceId] ?? createEmptyPageCrop(targetSourceId)),
          cropRect: nextCropRect,
          mode: clipboard.mode,
          presetSizeId: clipboard.presetSizeId,
          presetAnchor: clipboard.presetAnchor,
          marginsPt: cropRectToMargins(nextCropRect, page.widthPt, page.heightPt),
          splitConfig: clipboard.splitConfig ? { ...clipboard.splitConfig } : undefined,
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
    const page = resolvePageByStoreId(pageIndex, state.pages);
    const sourceId = page?.sourceId ?? pageIndex;
    const pageCrop = state.pageCrops[sourceId] ?? state.pageCrops[pageIndex];

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
        const page = resolvePageByStoreId(pageIndex, state.pages);
        if (!page) {
          continue;
        }

        const targetSourceId = page.sourceId;
        nextPageCrops[targetSourceId] = {
          ...(state.pageCrops[targetSourceId] ?? createEmptyPageCrop(targetSourceId)),
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
      const page = resolvePageByStoreId(pageIndex, state.pages);
      if (!page) return state;

      const targetSourceId = page.sourceId;
      const current = state.pageCrops[targetSourceId] ?? state.pageCrops[pageIndex];
      if (!current?.cropRect) {
        return state;
      }

      const rect = current.cropRect;
      const clamped = clampCropRect(
        {
          pageIndex: targetSourceId,
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
          [targetSourceId]: {
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
      selectedPageIndices: state.pages.map((page) => page.sourceId),
      selectionAnchorPageIndex: state.pages.length > 0 ? state.pages[0].sourceId : null,
    })),
  goToPrevPage: () =>
    set((state) => {
      const newIdx = Math.max(0, state.currentPageIndex - 1);
      const newPage = state.pages[newIdx];
      return {
        currentPageIndex: newIdx,
        selectedPageIndices: newPage ? [newPage.sourceId] : state.selectedPageIndices,
        selectionAnchorPageIndex: newPage ? newPage.sourceId : state.selectionAnchorPageIndex,
      };
    }),
  goToNextPage: () =>
    set((state) => {
      const newIdx = Math.min(state.pageCount - 1, state.currentPageIndex + 1);
      const newPage = state.pages[newIdx];
      return {
        currentPageIndex: newIdx,
        selectedPageIndices: newPage ? [newPage.sourceId] : state.selectedPageIndices,
        selectionAnchorPageIndex: newPage ? newPage.sourceId : state.selectionAnchorPageIndex,
      };
    }),
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
  restoreOriginalOrder: () =>
    set((state) => {
      if (state.pages.length === 0) return {};
      const sorted = [...state.pages].sort((a, b) => a.sourceId - b.sourceId);
      if (state.pages.every((p, i) => p.sourceId === sorted[i].sourceId)) return {};
      const currentSourceId = state.pages[state.currentPageIndex]?.sourceId;
      const newCurrentIndex = currentSourceId !== undefined
        ? sorted.findIndex((p) => p.sourceId === currentSourceId)
        : 0;
      const preservedSelected = state.selectedPageIndices.filter((sid) =>
        sorted.some((p) => p.sourceId === sid),
      );
      return {
        pages: sorted,
        currentPageIndex: newCurrentIndex >= 0 ? newCurrentIndex : 0,
        selectedPageIndices:
          preservedSelected.length > 0
            ? preservedSelected
            : (sorted[0] ? [sorted[0].sourceId] : []),
        selectionAnchorPageIndex: currentSourceId ?? sorted[0]?.sourceId ?? null,
      };
    }),
  isOrderModified: () => {
    const { pages } = get();
    if (pages.length === 0) return false;
    return !pages.every((p, i) => p.sourceId === i);
  },
  loadSession: (session) => {
    set((state) => {
      let nextPages = state.pages;
      if (Array.isArray(session.pageOrder) && session.pageOrder.length > 0 && state.pages.length > 0) {
        const sortedPages: PageMetadata[] = [];
        for (const sid of session.pageOrder) {
          const p = state.pages.find((item) => item.sourceId === sid);
          if (p) sortedPages.push(p);
        }
        for (const p of state.pages) {
          if (!sortedPages.some((item) => item.sourceId === p.sourceId)) {
            sortedPages.push(p);
          }
        }
        nextPages = sortedPages;
      }

      const nextPast = [...state.past, cloneHistorySnapshot(state.pageCrops)].slice(-HISTORY_LIMIT);

      return {
        pages: nextPages,
        pageCrops: session.pageCrops ?? state.pageCrops,
        displayUnit: session.displayUnit ?? state.displayUnit,
        templates:
          session.templates && session.templates.length > 0
            ? session.templates
            : state.templates,
        past: nextPast,
        future: [],
        lastAction: i18n.t("history.action.loadSession") as string,
      };
    });
    persistPreferences(get());
  },
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
