import { describe, expect, it } from "vitest";
import {
  analyzeContentBounds,
  estimateBackgroundColor,
  type PixelBuffer,
} from "@/utils/autoCrop";

function createBuffer(
  width: number,
  height: number,
  fillColor = [255, 255, 255],
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fillColor[0];
    data[i * 4 + 1] = fillColor[1];
    data[i * 4 + 2] = fillColor[2];
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

function drawRect(
  buffer: PixelBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  color = [0, 0, 0],
) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < buffer.width && py >= 0 && py < buffer.height) {
        const idx = (py * buffer.width + px) * 4;
        buffer.data[idx] = color[0];
        buffer.data[idx + 1] = color[1];
        buffer.data[idx + 2] = color[2];
      }
    }
  }
}

describe("autoCrop", () => {
  it("estimates background color correctly even with dark border artifacts", () => {
    const buf = createBuffer(200, 200, [250, 250, 250]);
    // Simulate dark scanner border line at outermost edges (x=0, y=0)
    drawRect(buf, 0, 0, 200, 2, [10, 10, 10]);
    drawRect(buf, 0, 0, 2, 200, [10, 10, 10]);

    const bg = estimateBackgroundColor(buf);
    // Background should remain close to 250, not affected by border line
    expect(bg.r).toBeGreaterThanOrEqual(240);
    expect(bg.g).toBeGreaterThanOrEqual(240);
    expect(bg.b).toBeGreaterThanOrEqual(240);
  });

  it("detects content boundary correctly on uniform document", () => {
    const buf = createBuffer(200, 200, [255, 255, 255]);
    // Draw content box at [40, 50, 80, 100]
    drawRect(buf, 40, 50, 80, 100, [0, 0, 0]);

    const bounds = analyzeContentBounds(buf);
    expect(bounds).not.toBeNull();
    expect(bounds!.minX).toBeCloseTo(40, -1);
    expect(bounds!.maxX).toBeCloseTo(120, -1);
    expect(bounds!.minY).toBeCloseTo(50, -1);
    expect(bounds!.maxY).toBeCloseTo(150, -1);
  });

  it("filters out single-pixel scanner border lines and noise", () => {
    const buf = createBuffer(200, 200, [255, 255, 255]);
    // Draw content box at [50, 60, 60, 60]
    drawRect(buf, 50, 60, 60, 60, [0, 0, 0]);
    // Draw 1px scanner border line at edge (x=0)
    drawRect(buf, 0, 0, 1, 200, [0, 0, 0]);

    const bounds = analyzeContentBounds(buf);
    expect(bounds).not.toBeNull();
    // Edge artifact at x=0 should be ignored, minX should be near 50
    expect(bounds!.minX).toBeGreaterThanOrEqual(40);
  });

  it("returns null on completely blank page", () => {
    const buf = createBuffer(100, 100, [255, 255, 255]);
    const bounds = analyzeContentBounds(buf);
    expect(bounds).toBeNull();
  });
});
