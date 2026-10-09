import { describe, expect, it } from "vitest";
import { computeTextItemsBoundingBox, type RawTextItem } from "@/utils/textAutoCrop";

describe("textAutoCrop", () => {
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  it("returns null cropRect when no valid text items exist", () => {
    const result = computeTextItemsBoundingBox([], pageWidth, pageHeight);
    expect(result.cropRect).toBeNull();
    expect(result.confidence).toBe(0);

    const emptyItems: RawTextItem[] = [
      { str: "   ", transform: [1, 0, 0, 1, 100, 200], width: 50 },
      { str: "", transform: [1, 0, 0, 1, 100, 200], width: 50 },
    ];
    const emptyResult = computeTextItemsBoundingBox(emptyItems, pageWidth, pageHeight);
    expect(emptyResult.cropRect).toBeNull();
  });

  it("computes accurate bounding box across multiple text items", () => {
    const items: RawTextItem[] = [
      // Top heading
      { str: "Paper Title", transform: [12, 0, 0, 12, 100, 750], width: 200, height: 14 },
      // Bottom footer text
      { str: "Page 1 of 10", transform: [9, 0, 0, 9, 250, 50], width: 60, height: 10 },
      // Rightmost text
      { str: "Right margin text", transform: [10, 0, 0, 10, 450, 400], width: 50, height: 10 },
    ];

    const result = computeTextItemsBoundingBox(items, pageWidth, pageHeight, 0);
    expect(result.cropRect).not.toBeNull();
    const box = result.cropRect!;

    // minX = 100, maxX = 450 + 50 = 500
    expect(box.x).toBe(100);
    expect(box.width).toBe(400);

    // minY = 50, maxY = 750 + 14 = 764
    expect(box.y).toBe(50);
    expect(box.height).toBe(714);
    expect(result.textItemCount).toBe(3);
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it("applies padding margin and clamps within page bounds", () => {
    const items: RawTextItem[] = [
      { str: "Near Edge", transform: [10, 0, 0, 10, 5, 10], width: 50, height: 10 },
    ];

    // Margin 20pt would push x to -15 and y to -10, which must be clamped to 0
    const result = computeTextItemsBoundingBox(items, pageWidth, pageHeight, 20);
    expect(result.cropRect).not.toBeNull();
    const box = result.cropRect!;
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
    expect(box.width).toBe(5 + 50 + 20); // 75
    expect(box.height).toBe(10 + 10 + 20); // 40
  });

  it("accurately handles 90-degree rotated vertical glyphs", () => {
    // 90-degree rotated: baseline along +Y, ascender along -X
    const items: RawTextItem[] = [
      { str: "Rotated Header", transform: [0, 10, -10, 0, 200, 300], width: 80, height: 10 },
    ];

    const result = computeTextItemsBoundingBox(items, pageWidth, pageHeight, 0);
    expect(result.cropRect).not.toBeNull();
    const box = result.cropRect!;

    // Baseline extends along Y from 300 to 300 + 80 = 380
    // Ascender extends along X from 200 to 200 - 10 = 190
    expect(box.x).toBe(190);
    expect(box.width).toBe(10);
    expect(box.y).toBe(300);
    expect(box.height).toBe(80);
  });
});
