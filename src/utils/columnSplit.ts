import type { ColumnSplitConfig, CropRect } from "@/types";

export function splitCropRect(
  cropRect: CropRect,
  config?: ColumnSplitConfig,
): CropRect[] {
  if (!config || config.direction === "none") {
    return [cropRect];
  }

  const { pageIndex, x, y, width, height } = cropRect;
  const ratio = Math.max(0.05, Math.min(0.95, config.splitRatio ?? 0.5));
  const maxX = x + width;
  const maxY = y + height;

  if (config.direction === "vertical") {
    const gutter = Math.max(0, Math.min(width * 0.5, config.gutterPt ?? 0));
    const availableW = Math.max(2, width - gutter);
    const w1 = Math.max(1, Math.min(availableW - 1, Math.round(availableW * ratio)));
    const x2 = Math.min(maxX - 1, x + w1 + gutter);
    const w2 = Math.max(1, maxX - x2);

    const leftRect: CropRect = {
      pageIndex,
      x,
      y,
      width: w1,
      height,
    };

    const rightRect: CropRect = {
      pageIndex,
      x: x2,
      y,
      width: w2,
      height,
    };

    return [leftRect, rightRect];
  }

  if (config.direction === "horizontal") {
    const gutter = Math.max(0, Math.min(height * 0.5, config.gutterPt ?? 0));
    const availableH = Math.max(2, height - gutter);
    const h2 = Math.max(1, Math.min(availableH - 1, Math.round(availableH * (1 - ratio))));
    const y1 = Math.min(maxY - 1, y + h2 + gutter);
    const h1 = Math.max(1, maxY - y1);

    // In PDF coordinates, origin is bottom-left.
    // Visual top part has higher Y:
    const topRect: CropRect = {
      pageIndex,
      x,
      y: y1,
      width,
      height: h1,
    };

    // Visual bottom part has lower Y:
    const bottomRect: CropRect = {
      pageIndex,
      x,
      y,
      width,
      height: h2,
    };

    return [topRect, bottomRect];
  }

  return [cropRect];
}
