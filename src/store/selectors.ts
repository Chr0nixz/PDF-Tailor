import type { PageCropState, PageMargins } from "@/types";

const emptyMargins = Object.freeze({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}) satisfies PageMargins;

export function selectCurrentPageCrop(
  currentPageIndex: number,
  pageCrops: Record<number, PageCropState>,
) {
  return pageCrops[currentPageIndex] ?? null;
}

export function selectCurrentMargins(
  currentPageIndex: number,
  pageCrops: Record<number, PageCropState>,
): PageMargins {
  return pageCrops[currentPageIndex]?.marginsPt ?? emptyMargins;
}

export function selectHasDocument(pageCount: number) {
  return pageCount > 0;
}
