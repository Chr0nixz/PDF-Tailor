import { describe, expect, it } from "vitest";
import {
  getRotatedCroppedPages,
  getRotatedPages,
  getMixedSizePages,
  getUncroppedPages,
  getDocumentDiagnostics,
  getActiveDiagnostics,
  isLargeDocument,
  isQuarterTurnRotation,
  normalizeRotation,
} from "@/utils/documentWarnings";
import type { PageCropState, PageMetadata } from "@/types";

const pages: PageMetadata[] = [
  { sourceId: 0, pageIndex: 0, widthPt: 400, heightPt: 600, rotation: 0, userRotation: 0 },
  { sourceId: 1, pageIndex: 1, widthPt: 600, heightPt: 400, rotation: 90, userRotation: 0 },
  { sourceId: 2, pageIndex: 2, widthPt: 600, heightPt: 400, rotation: 270, userRotation: 0 },
  { sourceId: 3, pageIndex: 3, widthPt: 400, heightPt: 600, rotation: 180, userRotation: 0 },
];

function createCrop(pageIndex: number): PageCropState {
  return {
    pageIndex,
    cropRect: { pageIndex, x: 10, y: 20, width: 100, height: 120 },
    mode: "free",
    marginsPt: { top: 0, right: 0, bottom: 0, left: 0 },
    updatedAt: Date.now(),
  };
}

describe("documentWarnings", () => {
  it("normalizes rotation into the 0-359 range", () => {
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
  });

  it("detects quarter-turn rotations only", () => {
    expect(isQuarterTurnRotation(90)).toBe(true);
    expect(isQuarterTurnRotation(270)).toBe(true);
    expect(isQuarterTurnRotation(180)).toBe(false);
  });

  it("returns rotated pages and rotated cropped pages", () => {
    expect(getRotatedPages(pages).map((page) => page.pageIndex)).toEqual([1, 2]);
    expect(
      getRotatedCroppedPages(pages, {
        0: createCrop(0),
        2: createCrop(2),
      }).map((page) => page.pageIndex),
    ).toEqual([2]);
  });

  it("flags large documents by page count or file size", () => {
    expect(isLargeDocument(100, 1024)).toBe(true);
    expect(isLargeDocument(10, 25 * 1024 * 1024)).toBe(true);
    expect(isLargeDocument(10, 1024)).toBe(false);
  });

  it("detects mixed-size pages", () => {
    const mixedPages: PageMetadata[] = [
      { sourceId: 0, pageIndex: 0, widthPt: 612, heightPt: 792, rotation: 0, userRotation: 0 },
      { sourceId: 1, pageIndex: 1, widthPt: 612, heightPt: 792, rotation: 0, userRotation: 0 },
      { sourceId: 2, pageIndex: 2, widthPt: 792, heightPt: 612, rotation: 90, userRotation: 0 },
      { sourceId: 3, pageIndex: 3, widthPt: 595, heightPt: 842, rotation: 0, userRotation: 0 },
    ];
    const mixed = getMixedSizePages(mixedPages);
    expect(mixed.map((p) => p.sourceId)).toEqual([3]);
  });

  it("returns uncropped pages", () => {
    const testPages: PageMetadata[] = [
      { sourceId: 0, pageIndex: 0, widthPt: 612, heightPt: 792, rotation: 0, userRotation: 0 },
      { sourceId: 1, pageIndex: 1, widthPt: 612, heightPt: 792, rotation: 0, userRotation: 0 },
    ];
    const pageCrops: Record<number, PageCropState> = {
      0: { pageIndex: 0, cropRect: { pageIndex: 0, x: 0, y: 0, width: 500, height: 600 }, mode: "free", marginsPt: { top: 0, right: 0, bottom: 0, left: 0 }, updatedAt: Date.now() },
    };
    const uncropped = getUncroppedPages(testPages, pageCrops);
    expect(uncropped.map((p) => p.sourceId)).toEqual([1]);
  });

  it("getDocumentDiagnostics returns structured diagnostics", () => {
    const testPages: PageMetadata[] = [
      { sourceId: 0, pageIndex: 0, widthPt: 612, heightPt: 792, rotation: 90, userRotation: 0 },
      { sourceId: 1, pageIndex: 1, widthPt: 612, heightPt: 792, rotation: 0, userRotation: 0 },
    ];
    const pageCrops: Record<number, PageCropState> = {};
    const diags = getDocumentDiagnostics(testPages, pageCrops);
    expect(diags.rotatedPages.severity).toBe("warning");
    expect(diags.rotatedPages.pageIndices).toEqual([0]);
    expect(diags.uncroppedPages.severity).toBe("info");
    expect(diags.largeDocument.id).toBe("large-document");
  });

  it("getActiveDiagnostics filters out empty diagnostics", () => {
    const testPages: PageMetadata[] = [
      { sourceId: 0, pageIndex: 0, widthPt: 612, heightPt: 792, rotation: 0, userRotation: 0 },
    ];
    const pageCrops: Record<number, PageCropState> = {};
    const diags = getDocumentDiagnostics(testPages, pageCrops);
    const active = getActiveDiagnostics(diags);
    // only large-document has no page indices but is still included
    expect(active.length).toBeGreaterThanOrEqual(1);
  });
});
