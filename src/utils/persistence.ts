import type { CropTemplate, PdfUnit, PresetAnchor } from "@/types";

const STORAGE_KEY = "pdf-tailor.preferences.v1";

export interface PersistedPreferences {
  displayUnit: PdfUnit;
  zoom: number;
  preferredPresetSizeId: string;
  preferredPresetAnchor: PresetAnchor;
  templates: CropTemplate[];
  selectedTemplateId: string | null;
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
    };
  } catch {
    return {};
  }
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
