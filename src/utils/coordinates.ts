import type { Rect } from "@/types";

export interface ViewportMetrics {
  scale: number;
  pageHeightPt: number;
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
