import { describe, expect, it } from "vitest";
import {
  getRotatedCroppedPages,
  getRotatedPages,
  isLargeDocument,
  isQuarterTurnRotation,
  normalizeRotation,
} from "@/utils/documentWarnings";
import type { PageCropState, PageMetadata } from "@/types";

const pages: PageMetadata[] = [
  { pageIndex: 0, widthPt: 400, heightPt: 600, rotation: 0 },
  { pageIndex: 1, widthPt: 600, heightPt: 400, rotation: 90 },
  { pageIndex: 2, widthPt: 600, heightPt: 400, rotation: 270 },
  { pageIndex: 3, widthPt: 400, heightPt: 600, rotation: 180 },
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
});
