import { describe, expect, it } from "vitest";
import { snapPoint, snapRect } from "@/utils/snapEngine";

describe("snapEngine", () => {
  it("snaps points to page edges and center lines", () => {
    const result = snapPoint({
      x: 98,
      y: 204,
      pageWidth: 200,
      pageHeight: 400,
      threshold: 5,
    });

    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
    expect(result.guides).toEqual([
      { orientation: "vertical", position: 100 },
      { orientation: "horizontal", position: 200 },
    ]);
  });

  it("snaps moved rectangles by their center to the page center", () => {
    const result = snapRect({
      rect: { pageIndex: 0, x: 42, y: 81, width: 120, height: 80 },
      pageWidth: 200,
      pageHeight: 240,
      threshold: 20,
      mode: "move",
      handle: "move",
    });

    expect(result.rect.x).toBe(40);
    expect(result.rect.y).toBe(80);
    expect(result.guides).toEqual([
      { orientation: "vertical", position: 100 },
      { orientation: "horizontal", position: 120 },
    ]);
  });

  it("snaps resized edges independently", () => {
    const result = snapRect({
      rect: { pageIndex: 0, x: 4, y: 8, width: 92, height: 188 },
      pageWidth: 200,
      pageHeight: 200,
      threshold: 10,
      mode: "resize",
      handle: "sw",
    });

    expect(result.rect.x).toBe(0);
    expect(result.rect.y).toBe(0);
    expect(result.rect.width).toBe(96);
    expect(result.rect.height).toBe(196);
    expect(result.guides).toEqual([
      { orientation: "vertical", position: 0 },
      { orientation: "horizontal", position: 0 },
    ]);
  });

  it("leaves rectangles unchanged when nothing is close enough", () => {
    const rect = { pageIndex: 0, x: 17, y: 26, width: 90, height: 70 };
    const result = snapRect({
      rect,
      pageWidth: 400,
      pageHeight: 500,
      threshold: 3,
      mode: "move",
      handle: "move",
    });

    expect(result.rect).toEqual(rect);
    expect(result.guides).toEqual([]);
  });
});
