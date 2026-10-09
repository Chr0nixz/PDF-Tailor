import type { CropTemplate, PageCropState, PdfTailorSession, PdfUnit } from "@/types";

export interface SessionValidationResult {
  valid: boolean;
  session?: PdfTailorSession;
  error?: string;
  warning?: string;
}

export function createSessionPayload(params: {
  fileName: string | null;
  pageCount: number;
  displayUnit: PdfUnit;
  pageOrder: number[];
  pageCrops: Record<number, PageCropState>;
  templates?: CropTemplate[];
}): PdfTailorSession {
  return {
    format: "pdf-tailor-session",
    version: "1.2.0",
    exportedAt: Date.now(),
    fileName: params.fileName,
    pageCount: params.pageCount,
    displayUnit: params.displayUnit,
    pageOrder: params.pageOrder,
    pageCrops: params.pageCrops,
    templates: params.templates ?? [],
  };
}

function sanitizeDownloadFileName(fileName: string | null): string {
  const baseName = fileName?.replace(/\.pdf$/i, "").trim() || "project";
  // Strip characters illegal in Windows/POSIX file paths
  const safeBase = baseName.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "_");
  return `${safeBase || "project"}.pdftailor`;
}

function sanitizePageCrops(rawCrops: unknown): Record<number, PageCropState> {
  if (typeof rawCrops !== "object" || rawCrops === null) {
    return {};
  }
  const clean: Record<number, PageCropState> = {};
  for (const [key, val] of Object.entries(rawCrops as Record<string, unknown>)) {
    const pageIndex = Number.parseInt(key, 10);
    if (!Number.isFinite(pageIndex) || pageIndex < 0 || typeof val !== "object" || val === null) {
      continue;
    }
    const crop = val as Record<string, unknown>;
    const rawRect = crop.cropRect as Record<string, unknown> | null | undefined;
    let cropRect = null;
    if (
      rawRect &&
      typeof rawRect === "object" &&
      typeof rawRect.x === "number" &&
      typeof rawRect.y === "number" &&
      typeof rawRect.width === "number" &&
      typeof rawRect.height === "number" &&
      Number.isFinite(rawRect.x) &&
      Number.isFinite(rawRect.y) &&
      Number.isFinite(rawRect.width) &&
      Number.isFinite(rawRect.height) &&
      rawRect.width > 0 &&
      rawRect.height > 0
    ) {
      cropRect = {
        pageIndex,
        x: Math.max(0, rawRect.x),
        y: Math.max(0, rawRect.y),
        width: rawRect.width,
        height: rawRect.height,
      };
    }

    const rawMargins = (crop.marginsPt as Record<string, unknown>) || {};
    const marginsPt = {
      top: typeof rawMargins.top === "number" && Number.isFinite(rawMargins.top) ? Math.max(0, rawMargins.top) : 0,
      right: typeof rawMargins.right === "number" && Number.isFinite(rawMargins.right) ? Math.max(0, rawMargins.right) : 0,
      bottom: typeof rawMargins.bottom === "number" && Number.isFinite(rawMargins.bottom) ? Math.max(0, rawMargins.bottom) : 0,
      left: typeof rawMargins.left === "number" && Number.isFinite(rawMargins.left) ? Math.max(0, rawMargins.left) : 0,
    };

    const rawSplit = crop.splitConfig as Record<string, unknown> | null | undefined;
    let splitConfig = undefined;
    if (
      rawSplit &&
      typeof rawSplit === "object" &&
      (rawSplit.direction === "vertical" || rawSplit.direction === "horizontal")
    ) {
      const splitRatio =
        typeof rawSplit.splitRatio === "number" && Number.isFinite(rawSplit.splitRatio)
          ? Math.max(0.05, Math.min(0.95, rawSplit.splitRatio))
          : 0.5;
      const gutterPt =
        typeof rawSplit.gutterPt === "number" && Number.isFinite(rawSplit.gutterPt)
          ? Math.max(0, rawSplit.gutterPt)
          : 0;
      splitConfig = {
        direction: rawSplit.direction as "vertical" | "horizontal",
        splitRatio,
        gutterPt,
      };
    }

    clean[pageIndex] = {
      pageIndex,
      cropRect,
      mode: crop.mode === "preset" ? "preset" : "free",
      presetSizeId: typeof crop.presetSizeId === "string" ? crop.presetSizeId : undefined,
      presetAnchor: typeof crop.presetAnchor === "string" ? (crop.presetAnchor as any) : undefined,
      marginsPt,
      splitConfig,
      updatedAt: typeof crop.updatedAt === "number" && Number.isFinite(crop.updatedAt) ? crop.updatedAt : Date.now(),
    };
  }
  return clean;
}

export function parseAndValidateSession(
  jsonContent: string,
  currentPageCount?: number,
): SessionValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    return { valid: false, error: "Invalid JSON format." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { valid: false, error: "Session payload must be an object." };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.format !== "pdf-tailor-session") {
    return { valid: false, error: "Unrecognized file format. Expected a .pdftailor session file." };
  }

  if (typeof obj.pageCount !== "number" || obj.pageCount < 0 || !Number.isFinite(obj.pageCount)) {
    return { valid: false, error: "Invalid or missing page count in session file." };
  }

  if (typeof obj.pageCrops !== "object" || obj.pageCrops === null) {
    return { valid: false, error: "Missing page crops mapping in session file." };
  }

  if (!Array.isArray(obj.pageOrder)) {
    return { valid: false, error: "Missing page order sequence in session file." };
  }

  // Clean pageOrder: filter positive finite numbers
  const cleanPageOrder = obj.pageOrder
    .map((item) => (typeof item === "number" ? item : Number.parseInt(String(item), 10)))
    .filter((n) => Number.isFinite(n) && n >= 0);

  const cleanCrops = sanitizePageCrops(obj.pageCrops);
  const displayUnit = obj.displayUnit === "pt" ? "pt" : "mm";

  const session: PdfTailorSession = {
    format: "pdf-tailor-session",
    version: "1.2.0",
    exportedAt: typeof obj.exportedAt === "number" && Number.isFinite(obj.exportedAt) ? obj.exportedAt : Date.now(),
    fileName: typeof obj.fileName === "string" ? obj.fileName : null,
    pageCount: Math.floor(obj.pageCount),
    displayUnit,
    pageOrder: cleanPageOrder,
    pageCrops: cleanCrops,
    templates: Array.isArray(obj.templates) ? (obj.templates as CropTemplate[]) : [],
  };

  let warning: string | undefined;
  if (currentPageCount !== undefined && currentPageCount > 0 && session.pageCount !== currentPageCount) {
    warning = `Document page count mismatch (Session: ${session.pageCount}, Current: ${currentPageCount}).`;
  }

  return {
    valid: true,
    session,
    warning,
  };
}

export function downloadSessionFile(session: PdfTailorSession) {
  const downloadFileName = sanitizeDownloadFileName(session.fileName);
  const jsonString = JSON.stringify(session, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = downloadFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
