import type { PageCropState, PageMetadata } from "@/types";

export function normalizeRotation(rotation: number) {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function isQuarterTurnRotation(rotation: number) {
  const normalized = normalizeRotation(rotation);
  return normalized === 90 || normalized === 270;
}

export function getRotatedPages(pages: PageMetadata[]) {
  return pages.filter((page) => isQuarterTurnRotation(page.rotation));
}

export function getRotatedCroppedPages(
  pages: PageMetadata[],
  pageCrops: Record<number, PageCropState>,
) {
  return pages.filter(
    (page) => isQuarterTurnRotation(page.rotation) && Boolean(pageCrops[page.sourceId]?.cropRect),
  );
}

export function isLargeDocument(pageCount: number, fileSizeBytes?: number) {
  return pageCount >= 100 || (fileSizeBytes ?? 0) >= 25 * 1024 * 1024;
}

export function formatRotatedPagesList(
  pages: { pageIndex: number }[],
  separator: string = ", ",
) {
  return pages.map((page) => page.pageIndex + 1).join(separator);
}

/**
 * Returns pages whose physical dimensions (widthPt x heightPt) differ from the majority.
 * Pages with swapped dimensions (e.g., 612x792 vs 792x612) are considered the same size.
 */
export function getMixedSizePages(pages: PageMetadata[]): PageMetadata[] {
  if (pages.length <= 1) return [];

  // Build a size fingerprint, normalizing for rotation
  const sizeMap = new Map<string, PageMetadata[]>();
  for (const page of pages) {
    const w = Math.round(page.widthPt);
    const h = Math.round(page.heightPt);
    // Normalize landscape/portrait by sorting dimensions
    const key = w <= h ? `${w}x${h}` : `${h}x${w}`;
    const existing = sizeMap.get(key) ?? [];
    existing.push(page);
    sizeMap.set(key, existing);
  }

  // The dominant size is the largest group
  let dominantKey = "";
  let dominantCount = 0;
  for (const [key, group] of sizeMap) {
    if (group.length > dominantCount) {
      dominantKey = key;
      dominantCount = group.length;
    }
  }

  // Return pages NOT in the dominant group
  const dominant = sizeMap.get(dominantKey) ?? [];
  return pages.filter((p) => !dominant.includes(p));
}

/**
 * Returns pages that have NOT been cropped (i.e., no cropRect set).
 */
export function getUncroppedPages(
  pages: PageMetadata[],
  pageCrops: Record<number, PageCropState>,
): PageMetadata[] {
  return pages.filter((page) => !pageCrops[page.sourceId]?.cropRect);
}

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface Diagnostic {
  id: string;
  severity: DiagnosticSeverity;
  messageKey: string;
  messageParams: Record<string, unknown>;
  pageIndices: number[];
}

export interface DocumentDiagnostics {
  rotatedPages: Diagnostic;
  mixedSizePages: Diagnostic;
  uncroppedPages: Diagnostic;
  largeDocument: Diagnostic;
}

const SEVERITY_ORDER: Record<DiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function getDocumentDiagnostics(
  pages: PageMetadata[],
  pageCrops: Record<number, PageCropState>,
  fileSizeBytes?: number,
): DocumentDiagnostics {
  const rotated = getRotatedPages(pages);
  const mixedSize = getMixedSizePages(pages);
  const uncropped = getUncroppedPages(pages, pageCrops);
  const large = isLargeDocument(pages.length, fileSizeBytes);

  return {
    rotatedPages: {
      id: "rotated-pages",
      severity: "warning",
      messageKey: "diagnostics.rotatedPages",
      messageParams: { count: rotated.length, list: formatRotatedPagesList(rotated) },
      pageIndices: rotated.map((p) => p.sourceId),
    },
    mixedSizePages: {
      id: "mixed-size-pages",
      severity: "info",
      messageKey: "diagnostics.mixedSizePages",
      messageParams: { count: mixedSize.length, list: mixedSize.map((p) => p.sourceId + 1).join(", ") },
      pageIndices: mixedSize.map((p) => p.sourceId),
    },
    uncroppedPages: {
      id: "uncropped-pages",
      severity: "info",
      messageKey: "diagnostics.uncroppedPages",
      messageParams: { count: uncropped.length },
      pageIndices: uncropped.map((p) => p.sourceId),
    },
    largeDocument: {
      id: "large-document",
      severity: "info",
      messageKey: "diagnostics.largeDocument",
      messageParams: { count: pages.length },
      pageIndices: [],
    },
  };
}

/**
 * Returns all diagnostics with at least one affected page (or large document flag).
 * Sorted by severity (error > warning > info).
 */
export function getActiveDiagnostics(diagnostics: DocumentDiagnostics): Diagnostic[] {
  const all = Object.values(diagnostics).filter(
    (d) => d.pageIndices.length > 0 || d.id === "large-document",
  );
  return all.sort((a, b) => (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 3) - (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 3));
}
