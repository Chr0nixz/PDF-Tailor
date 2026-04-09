import { cropRectToMargins } from "@/utils/coordinates";
import type { CropRect, PageCropState, PageMargins, PageMetadata } from "@/types";

const emptyMargins = Object.freeze({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}) satisfies PageMargins;

export function selectCurrentPageCrop(
  currentPageIndex: number,
  pageCrops: Record<number, PageCropState>,
  draftCropRect?: CropRect | null,
  dragPageIndex?: number | null,
) {
  if (draftCropRect && dragPageIndex === currentPageIndex) {
    return {
      ...(pageCrops[currentPageIndex] ?? {
        pageIndex: currentPageIndex,
        cropRect: null,
        mode: "free" as const,
        marginsPt: emptyMargins,
        updatedAt: Date.now(),
      }),
      cropRect: draftCropRect,
    };
  }

  return pageCrops[currentPageIndex] ?? null;
}

export function selectCurrentMargins(
  currentPageIndex: number,
  pages: PageMetadata[],
  pageCrops: Record<number, PageCropState>,
  draftCropRect?: CropRect | null,
  dragPageIndex?: number | null,
): PageMargins {
  const page = pages[currentPageIndex];
  const sourceId = page?.sourceId ?? currentPageIndex;

  if (page && draftCropRect && dragPageIndex === currentPageIndex) {
    return cropRectToMargins(draftCropRect, page.widthPt, page.heightPt);
  }

  return pageCrops[sourceId]?.marginsPt ?? emptyMargins;
}

export function selectHasDocument(pageCount: number) {
  return pageCount > 0;
}
