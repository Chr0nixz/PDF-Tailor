import type { CropRect, PageMargins, PresetAnchor, Rect } from "@/types";
import { mmToPt } from "@/utils/unitConversion";

export interface ViewportMetrics {
  scale: number;
  pageHeightPt: number;
  pageWidthPt: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export function screenToCanvasPoint(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
): CanvasPoint {
  return {
    x: clientX - bounds.left,
    y: clientY - bounds.top,
  };
}

export function canvasToPdfPoint(
  point: CanvasPoint,
  viewport: ViewportMetrics,
): CanvasPoint {
  return {
    x: point.x / viewport.scale,
    y: viewport.pageHeightPt - point.y / viewport.scale,
  };
}

export function pdfToCanvasPoint(
  point: CanvasPoint,
  viewport: ViewportMetrics,
): CanvasPoint {
  return {
    x: point.x * viewport.scale,
    y: (viewport.pageHeightPt - point.y) * viewport.scale,
  };
}

export function pdfRectToCanvasRect(rect: Rect, viewport: ViewportMetrics): Rect {
  const topLeft = pdfToCanvasPoint(
    { x: rect.x, y: rect.y + rect.height },
    viewport,
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rect.width * viewport.scale,
    height: rect.height * viewport.scale,
  };
}

export function createCropRectFromPoints(
  start: CanvasPoint,
  end: CanvasPoint,
  pageIndex: number,
): CropRect {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const bottom = Math.min(start.y, end.y);
  const top = Math.max(start.y, end.y);

  return {
    pageIndex,
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom,
  };
}

export function clampRectToPage(
  rect: CropRect,
  pageWidthPt: number,
  pageHeightPt: number,
  minSizePt = 12,
): CropRect {
  const maxLeft = Math.max(0, pageWidthPt - minSizePt);
  const maxBottom = Math.max(0, pageHeightPt - minSizePt);

  let left = Math.min(Math.max(rect.x, 0), maxLeft);
  let bottom = Math.min(Math.max(rect.y, 0), maxBottom);
  let right = Math.min(Math.max(rect.x + rect.width, minSizePt), pageWidthPt);
  let top = Math.min(Math.max(rect.y + rect.height, minSizePt), pageHeightPt);

  if (right - left < minSizePt) {
    if (left <= 0) {
      right = Math.min(pageWidthPt, minSizePt);
    } else {
      left = Math.max(0, right - minSizePt);
    }
  }

  if (top - bottom < minSizePt) {
    if (bottom <= 0) {
      top = Math.min(pageHeightPt, minSizePt);
    } else {
      bottom = Math.max(0, top - minSizePt);
    }
  }

  return {
    pageIndex: rect.pageIndex,
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom,
  };
}

export function cropRectToMargins(
  rect: Rect | null,
  pageWidthPt: number,
  pageHeightPt: number,
): PageMargins {
  if (!rect) {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  return {
    top: Math.max(0, pageHeightPt - (rect.y + rect.height)),
    right: Math.max(0, pageWidthPt - (rect.x + rect.width)),
    bottom: Math.max(0, rect.y),
    left: Math.max(0, rect.x),
  };
}

export function marginsToCropRect(
  margins: PageMargins,
  pageWidthPt: number,
  pageHeightPt: number,
  pageIndex: number,
): CropRect {
  const left = Math.max(0, margins.left);
  const right = Math.max(0, margins.right);
  const bottom = Math.max(0, margins.bottom);
  const top = Math.max(0, margins.top);

  return clampRectToPage(
    {
      pageIndex,
      x: left,
      y: bottom,
      width: Math.max(12, pageWidthPt - left - right),
      height: Math.max(12, pageHeightPt - top - bottom),
    },
    pageWidthPt,
    pageHeightPt,
  );
}

export function createPresetCropRect(
  {
    widthMm,
    heightMm,
  }: {
    widthMm: number;
    heightMm: number;
  },
  pageWidthPt: number,
  pageHeightPt: number,
  pageIndex: number,
  anchor: PresetAnchor,
): CropRect {
  const width = Math.min(mmToPt(widthMm), pageWidthPt);
  const height = Math.min(mmToPt(heightMm), pageHeightPt);

  const xByAnchor: Record<PresetAnchor, number> = {
    "top-left": 0,
    "top-center": (pageWidthPt - width) / 2,
    "top-right": pageWidthPt - width,
    "center-left": 0,
    center: (pageWidthPt - width) / 2,
    "center-right": pageWidthPt - width,
    "bottom-left": 0,
    "bottom-center": (pageWidthPt - width) / 2,
    "bottom-right": pageWidthPt - width,
  };

  const yByAnchor: Record<PresetAnchor, number> = {
    "top-left": pageHeightPt - height,
    "top-center": pageHeightPt - height,
    "top-right": pageHeightPt - height,
    "center-left": (pageHeightPt - height) / 2,
    center: (pageHeightPt - height) / 2,
    "center-right": (pageHeightPt - height) / 2,
    "bottom-left": 0,
    "bottom-center": 0,
    "bottom-right": 0,
  };

  return clampRectToPage(
    {
      pageIndex,
      x: xByAnchor[anchor],
      y: yByAnchor[anchor],
      width,
      height,
    },
    pageWidthPt,
    pageHeightPt,
  );
}

export function mirrorMargins(margins: PageMargins): PageMargins {
  return {
    top: margins.top,
    right: margins.left,
    bottom: margins.bottom,
    left: margins.right,
  };
}
