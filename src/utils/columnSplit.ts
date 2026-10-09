import type { ColumnSplitConfig, CropRect, ExclusionBands } from "@/types";

export function applyExclusionBands(
  cropRect: CropRect,
  bands?: ExclusionBands,
): CropRect {
  if (!bands) {
    return cropRect;
  }
  const headerPt = Math.max(0, bands.headerPt || 0);
  const footerPt = Math.max(0, bands.footerPt || 0);
  if (headerPt === 0 && footerPt === 0) {
    return cropRect;
  }

  const availableHeight = Math.max(2, cropRect.height);
  const totalExclusion = Math.min(availableHeight - 1, headerPt + footerPt);
  const safeFooter = Math.min(footerPt, totalExclusion);
  const safeHeight = Math.max(1, availableHeight - totalExclusion);

  return {
    ...cropRect,
    y: cropRect.y + safeFooter,
    height: safeHeight,
  };
}

export function splitCropRect(
  cropRect: CropRect,
  config?: ColumnSplitConfig,
  exclusionBands?: ExclusionBands,
): CropRect[] {
  const effectiveRect = applyExclusionBands(cropRect, exclusionBands);
  if (!config || config.direction === "none") {
    return [effectiveRect];
  }

  const { pageIndex, x, y, width, height } = effectiveRect;
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

  if (config.direction === "grid") {
    const rows = Math.max(1, Math.min(4, config.rows ?? 2));
    const columns = Math.max(1, Math.min(4, config.columns ?? 2));
    const gutterX = Math.max(0, Math.min(width * 0.4, config.gutterXPt ?? config.gutterPt ?? 0));
    const gutterY = Math.max(0, Math.min(height * 0.4, config.gutterYPt ?? config.gutterPt ?? 0));
    const order = config.readingOrder ?? "ltr-ttb";

    const availableW = Math.max(columns * 2, width - (columns - 1) * gutterX);
    const availableH = Math.max(rows * 2, height - (rows - 1) * gutterY);

    const cellW = Math.max(1, Math.floor(availableW / columns));
    const cellH = Math.max(1, Math.floor(availableH / rows));

    // Precalculate column X boundaries [left, right]
    const colIntervals: { left: number; right: number }[] = [];
    let curX = x;
    for (let c = 0; c < columns; c++) {
      const left = Math.min(maxX - 1, curX);
      const right = c === columns - 1 ? maxX : Math.min(maxX, left + cellW);
      colIntervals.push({ left, right: Math.max(left + 1, right) });
      curX = right + gutterX;
    }

    // Precalculate row Y boundaries [bottom, top] in PDF coordinates (origin bottom-left)
    // Row 0 is visually at the top (top = maxY)
    const rowIntervals: { bottom: number; top: number }[] = [];
    let curTop = maxY;
    for (let r = 0; r < rows; r++) {
      const top = Math.max(y + 1, curTop);
      const bottom = r === rows - 1 ? y : Math.max(y, top - cellH);
      rowIntervals.push({ bottom: Math.min(bottom, top - 1), top });
      curTop = bottom - gutterY;
    }

    const gridCells: { row: number; col: number; rect: CropRect }[] = [];

    for (let r = 0; r < rows; r++) {
      const { bottom: cellY, top: cellTop } = rowIntervals[r];
      const effectiveCellH = Math.max(1, cellTop - cellY);

      for (let c = 0; c < columns; c++) {
        const { left: cellX, right: cellRight } = colIntervals[c];
        const effectiveCellW = Math.max(1, cellRight - cellX);

        gridCells.push({
          row: r,
          col: c,
          rect: {
            pageIndex,
            x: cellX,
            y: cellY,
            width: effectiveCellW,
            height: effectiveCellH,
          },
        });
      }
    }

    if (order === "ttb-ltr") {
      // Column-first: top-to-bottom, then left-to-right
      gridCells.sort((a, b) => a.col - b.col || a.row - b.row);
    } else if (order === "rtl-ttb") {
      // Right-to-left, then top-to-bottom
      gridCells.sort((a, b) => a.row - b.row || b.col - a.col);
    } else {
      // Row-first: left-to-right, then top-to-bottom
      gridCells.sort((a, b) => a.row - b.row || a.col - b.col);
    }

    return gridCells.map((item) => item.rect);
  }

  return [effectiveRect];
}
