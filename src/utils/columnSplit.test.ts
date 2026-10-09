import { describe, expect, it } from "vitest";
import { applyExclusionBands, splitCropRect } from "@/utils/columnSplit";
import type { CropRect } from "@/types";

describe("columnSplit", () => {
  const baseRect: CropRect = {
    pageIndex: 0,
    x: 50,
    y: 100,
    width: 200,
    height: 300,
  };

  it("returns original cropRect in array when config is undefined or none", () => {
    expect(splitCropRect(baseRect)).toEqual([baseRect]);
    expect(splitCropRect(baseRect, { direction: "none", splitRatio: 0.5 })).toEqual([baseRect]);
  });

  it("splits vertically into left and right rects with default 50% ratio", () => {
    const result = splitCropRect(baseRect, { direction: "vertical", splitRatio: 0.5 });
    expect(result).toHaveLength(2);

    const [left, right] = result;
    expect(left).toEqual({
      pageIndex: 0,
      x: 50,
      y: 100,
      width: 100,
      height: 300,
    });
    expect(right).toEqual({
      pageIndex: 0,
      x: 150,
      y: 100,
      width: 100,
      height: 300,
    });
  });

  it("splits vertically with gutter spacing between columns", () => {
    const result = splitCropRect(baseRect, { direction: "vertical", splitRatio: 0.5, gutterPt: 20 });
    expect(result).toHaveLength(2);

    const [left, right] = result;
    // available width = 200 - 20 = 180. Each column is 90
    expect(left.width).toBe(90);
    expect(right.width).toBe(90);
    expect(right.x).toBe(50 + 90 + 20); // 160
  });

  it("splits horizontally into top and bottom rects with correct PDF Y coords", () => {
    const result = splitCropRect(baseRect, { direction: "horizontal", splitRatio: 0.5 });
    expect(result).toHaveLength(2);

    const [top, bottom] = result;
    // height = 300, each is 150
    // top has higher Y: y (100) + h2 (150) = 250
    expect(top).toEqual({
      pageIndex: 0,
      x: 50,
      y: 250,
      width: 200,
      height: 150,
    });
    // bottom has lower Y: y = 100
    expect(bottom).toEqual({
      pageIndex: 0,
      x: 50,
      y: 100,
      width: 200,
      height: 150,
    });
  });

  it("strictly clamps segments within parent rect boundaries even under extreme parameters", () => {
    // Huge gutter (exceeding width), extreme ratio (1.0)
    const result = splitCropRect(baseRect, { direction: "vertical", splitRatio: 0.99, gutterPt: 500 });
    expect(result).toHaveLength(2);
    const [left, right] = result;

    // Both segments must be strictly within parent [x, x + width]
    expect(left.x).toBeGreaterThanOrEqual(baseRect.x);
    expect(left.x + left.width).toBeLessThanOrEqual(baseRect.x + baseRect.width);
    expect(right.x).toBeGreaterThanOrEqual(baseRect.x);
    expect(right.x + right.width).toBeLessThanOrEqual(baseRect.x + baseRect.width);
    expect(left.width).toBeGreaterThanOrEqual(1);
    expect(right.width).toBeGreaterThanOrEqual(1);
  });

  it("applies exclusion bands to strip header and footer zones safely", () => {
    // baseRect: y: 100, height: 300
    // header: 40pt, footer: 20pt -> clean y: 120, clean height: 300 - 60 = 240
    const stripped = applyExclusionBands(baseRect, { headerPt: 40, footerPt: 20 });
    expect(stripped.y).toBe(120);
    expect(stripped.height).toBe(240);
    expect(stripped.x).toBe(50);
    expect(stripped.width).toBe(200);

    // Splits vertically based on the stripped clean area
    const columns = splitCropRect(baseRect, { direction: "vertical", splitRatio: 0.5 }, { headerPt: 40, footerPt: 20 });
    expect(columns).toHaveLength(2);
    expect(columns[0].height).toBe(240);
    expect(columns[0].y).toBe(120);
    expect(columns[1].height).toBe(240);
    expect(columns[1].y).toBe(120);
  });

  it("splits into N-Grid segments with specified rows, columns, and reading order", () => {
    // 2x2 grid on baseRect (x: 50, y: 100, width: 200, height: 300)
    const gridResult = splitCropRect(baseRect, {
      direction: "grid",
      rows: 2,
      columns: 2,
      readingOrder: "ltr-ttb",
    });

    expect(gridResult).toHaveLength(4);
    // Row 0, Col 0 (Top-left): x = 50, y = 100 + 150 = 250, w = 100, h = 150
    expect(gridResult[0]).toEqual({
      pageIndex: 0,
      x: 50,
      y: 250,
      width: 100,
      height: 150,
    });
    // Row 0, Col 1 (Top-right): x = 150, y = 250, w = 100, h = 150
    expect(gridResult[1]).toEqual({
      pageIndex: 0,
      x: 150,
      y: 250,
      width: 100,
      height: 150,
    });
    // Row 1, Col 0 (Bottom-left): x = 50, y = 100, w = 100, h = 150
    expect(gridResult[2]).toEqual({
      pageIndex: 0,
      x: 50,
      y: 100,
      width: 100,
      height: 150,
    });
    // Row 1, Col 1 (Bottom-right): x = 150, y = 100, w = 100, h = 150
    expect(gridResult[3]).toEqual({
      pageIndex: 0,
      x: 150,
      y: 100,
      width: 100,
      height: 150,
    });

    // Column-first reading order ("ttb-ltr"): top-left -> bottom-left -> top-right -> bottom-right
    const colFirst = splitCropRect(baseRect, {
      direction: "grid",
      rows: 2,
      columns: 2,
      readingOrder: "ttb-ltr",
    });
    expect(colFirst[0]).toEqual(gridResult[0]); // Top-left
    expect(colFirst[1]).toEqual(gridResult[2]); // Bottom-left
    expect(colFirst[2]).toEqual(gridResult[1]); // Top-right
    expect(colFirst[3]).toEqual(gridResult[3]); // Bottom-right
  });
});
