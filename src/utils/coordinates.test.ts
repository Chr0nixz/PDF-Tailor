import { describe, expect, it } from "vitest";
import {
  canvasToPdfPoint,
  clampRectToPage,
  createCropRectFromPoints,
  createPresetCropRect,
  cropRectToMargins,
  marginsToCropRect,
  pdfRectToCanvasRect,
  pdfToCanvasPoint,
} from "@/utils/coordinates";

const viewport = {
  scale: 2,
  pageWidthPt: 200,
  pageHeightPt: 300,
};

describe("coordinates", () => {
  it("converts between canvas and pdf coordinates", () => {
    const pdfPoint = canvasToPdfPoint({ x: 40, y: 60 }, viewport);

    expect(pdfPoint).toEqual({ x: 20, y: 270 });
    expect(pdfToCanvasPoint(pdfPoint, viewport)).toEqual({ x: 40, y: 60 });
  });

  it("maps pdf rects into canvas rects", () => {
    const canvasRect = pdfRectToCanvasRect(
      { x: 10, y: 20, width: 40, height: 60 },
      viewport,
    );

    expect(canvasRect).toEqual({ x: 20, y: 440, width: 80, height: 120 });
  });

  it("creates a crop rect regardless of drag direction", () => {
    expect(
      createCropRectFromPoints({ x: 80, y: 10 }, { x: 20, y: 70 }, 3),
    ).toEqual({
      pageIndex: 3,
      x: 20,
      y: 10,
      width: 60,
      height: 60,
    });
  });

  it("clamps crop rectangles to page bounds and minimum size", () => {
    expect(
      clampRectToPage({ pageIndex: 0, x: -20, y: -10, width: 5, height: 8 }, 100, 120, 12),
    ).toEqual({
      pageIndex: 0,
      x: 0,
      y: 0,
      width: 12,
      height: 12,
    });
  });

  it("round-trips between crop rects and margins", () => {
    const rect = { pageIndex: 1, x: 20, y: 30, width: 140, height: 220 };
    const margins = cropRectToMargins(rect, 200, 300);

    expect(margins).toEqual({
      top: 50,
      right: 40,
      bottom: 30,
      left: 20,
    });

    expect(marginsToCropRect(margins, 200, 300, 1)).toEqual(rect);
  });

  it("creates preset crop rects anchored within the page", () => {
    const rect = createPresetCropRect(
      { widthMm: 210, heightMm: 297 },
      700,
      900,
      0,
      "center",
    );

    expect(rect.pageIndex).toBe(0);
    expect(rect.width).toBeCloseTo(595.2756, 4);
    expect(rect.height).toBeCloseTo(841.8898, 4);
    expect(rect.x).toBeCloseTo((700 - rect.width) / 2, 4);
    expect(rect.y).toBeCloseTo((900 - rect.height) / 2, 4);
  });

  it("truncates oversized presets to the current page", () => {
    const rect = createPresetCropRect(
      { widthMm: 210, heightMm: 297 },
      595.2756,
      792,
      0,
      "top-center",
    );

    expect(rect.width).toBeCloseTo(595.2756, 4);
    expect(rect.height).toBe(792);
    expect(rect.x).toBeCloseTo(0, 4);
    expect(rect.y).toBeCloseTo(0, 4);
  });
});
