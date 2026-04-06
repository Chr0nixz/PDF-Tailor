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
    (page) => isQuarterTurnRotation(page.rotation) && Boolean(pageCrops[page.pageIndex]?.cropRect),
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
