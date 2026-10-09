import type { ColumnSplitConfig, CropTemplate, PdfUnit, PresetAnchor } from "@/types";
import type { KeyBinding } from "@/hooks/useKeyBindings";

const STORAGE_KEY = "pdf-tailor.preferences.v1";

export const MAX_RECENT_FILES = 10;

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

export interface PersistedPreferences {
  displayUnit: PdfUnit;
  zoom: number;
  preferredPresetSizeId: string;
  preferredPresetAnchor: PresetAnchor;
  templates: CropTemplate[];
  selectedTemplateId: string | null;
  themeName: "paper" | "midnight" | "warm" | "high-contrast";
  lastExportScope: "current" | "selected" | "all";
  lastExportMode: "crop-box" | "redraw";
  onboardingCompleted: boolean;
  onboardingStep: number;
  keyBindings?: KeyBinding[] | null;
  sidebarWidth?: number;
  propertiesPanelWidth?: number;
  sidebarCollapsed?: boolean;
  propertiesPanelCollapsed?: boolean;
  mirrorMarginsEnabled?: boolean;
  recentFiles: RecentFile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampZoom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0.25, Math.min(3, value))
    : 1;
}

function normalizeMarginsRatio(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const top = typeof value.top === "number" ? value.top : 0;
  const right = typeof value.right === "number" ? value.right : 0;
  const bottom = typeof value.bottom === "number" ? value.bottom : 0;
  const left = typeof value.left === "number" ? value.left : 0;

  return {
    top: Math.max(0, Math.min(1, top)),
    right: Math.max(0, Math.min(1, right)),
    bottom: Math.max(0, Math.min(1, bottom)),
    left: Math.max(0, Math.min(1, left)),
  };
}

function normalizeSplitConfig(value: unknown): ColumnSplitConfig | undefined {
  if (!isRecord(value)) return undefined;
  const direction = value.direction;
  if (direction !== "vertical" && direction !== "horizontal") return undefined;
  const splitRatio =
    typeof value.splitRatio === "number" && Number.isFinite(value.splitRatio)
      ? Math.max(0.05, Math.min(0.95, value.splitRatio))
      : 0.5;
  const gutterPt =
    typeof value.gutterPt === "number" && Number.isFinite(value.gutterPt)
      ? Math.max(0, value.gutterPt)
      : 0;
  return { direction, splitRatio, gutterPt };
}

function normalizeTemplate(value: unknown): CropTemplate | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  const marginsRatio = normalizeMarginsRatio(value.marginsRatio);
  if (!marginsRatio) {
    return null;
  }

  const name =
    typeof value.name === "string" && value.name.trim().length > 0
      ? value.name.trim()
      : "已保存模板";
  const mode = value.mode === "preset" ? "preset" : "free";

  return {
    id: value.id,
    name,
    mode,
    presetSizeId: typeof value.presetSizeId === "string" ? value.presetSizeId : undefined,
    presetAnchor:
      typeof value.presetAnchor === "string"
        ? (value.presetAnchor as PresetAnchor)
        : undefined,
    marginsRatio,
    splitConfig: normalizeSplitConfig(value.splitConfig),
    createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
  };
}

export function loadPersistedPreferences(): Partial<PersistedPreferences> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    const templates = Array.isArray(parsed.templates)
      ? parsed.templates.map(normalizeTemplate).filter((template): template is CropTemplate => Boolean(template))
      : [];
    const selectedTemplateId =
      typeof parsed.selectedTemplateId === "string" ? parsed.selectedTemplateId : null;

    return {
      displayUnit: parsed.displayUnit === "pt" ? "pt" : "mm",
      zoom: clampZoom(parsed.zoom),
      preferredPresetSizeId:
        typeof parsed.preferredPresetSizeId === "string" ? parsed.preferredPresetSizeId : "a4",
      preferredPresetAnchor:
        typeof parsed.preferredPresetAnchor === "string"
          ? (parsed.preferredPresetAnchor as PresetAnchor)
          : "center",
      templates,
      selectedTemplateId: templates.some((template) => template.id === selectedTemplateId)
        ? selectedTemplateId
        : null,
      themeName:
        parsed.themeName === "paper" ||
        parsed.themeName === "midnight" ||
        parsed.themeName === "warm" ||
        parsed.themeName === "high-contrast"
          ? parsed.themeName
          : "paper",
      lastExportScope:
        parsed.lastExportScope === "current" ||
        parsed.lastExportScope === "selected" ||
        parsed.lastExportScope === "all"
          ? parsed.lastExportScope
          : "all",
      lastExportMode:
        parsed.lastExportMode === "crop-box" || parsed.lastExportMode === "redraw"
          ? parsed.lastExportMode
          : "crop-box",
      onboardingCompleted: typeof parsed.onboardingCompleted === "boolean" ? parsed.onboardingCompleted : false,
      onboardingStep:
        typeof parsed.onboardingStep === "number" && Number.isInteger(parsed.onboardingStep)
          ? Math.max(0, parsed.onboardingStep)
          : 0,
      keyBindings: Array.isArray(parsed.keyBindings) ? parsed.keyBindings as KeyBinding[] : null,
      sidebarWidth:
        typeof parsed.sidebarWidth === "number" && parsed.sidebarWidth >= 200 && parsed.sidebarWidth <= 500
          ? parsed.sidebarWidth
          : 280,
      propertiesPanelWidth:
        typeof parsed.propertiesPanelWidth === "number" &&
        parsed.propertiesPanelWidth >= 240 &&
        parsed.propertiesPanelWidth <= 480
          ? parsed.propertiesPanelWidth
          : 320,
      sidebarCollapsed: typeof parsed.sidebarCollapsed === "boolean" ? parsed.sidebarCollapsed : false,
      propertiesPanelCollapsed:
        typeof parsed.propertiesPanelCollapsed === "boolean" ? parsed.propertiesPanelCollapsed : false,
      mirrorMarginsEnabled:
        typeof parsed.mirrorMarginsEnabled === "boolean" ? parsed.mirrorMarginsEnabled : false,
      recentFiles: normalizeRecentFiles(parsed.recentFiles),
    };
  } catch {
    return {};
  }
}

function normalizeRecentFiles(value: unknown): RecentFile[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .filter((item) => typeof item.path === "string" && typeof item.name === "string" && typeof item.lastOpened === "number")
    .map((item) => ({
      path: item.path as string,
      name: item.name as string,
      lastOpened: item.lastOpened as number,
    }))
    .slice(0, MAX_RECENT_FILES);
}

export function savePersistedPreferences(preferences: PersistedPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Ignore persistence failures and keep the editor usable.
  }
}
