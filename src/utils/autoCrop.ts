import type { PDFDocumentProxy } from "@/lib/pdfjs";

/** Result of auto-crop detection. */
export interface AutoCropResult {
  /** Crop rectangle in PDF points (origin bottom-left in PDF coords). */
  cropRect: { x: number; y: number; width: number; height: number } | null;
  /** Confidence score 0-1; below 0.5 suggests manual review. */
  confidence: number;
}

export interface PixelBuffer {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

const SCAN_SCALE = 2; // Render at 2x for quality

/**
 * Determine representative background color using multi-point sampling & luminance histogram mode.
 * Filters out dark border artifacts, scanner frames, or binding shadows.
 */
export function estimateBackgroundColor(buffer: PixelBuffer): { r: number; g: number; b: number } {
  const { data, width, height } = buffer;

  // Sample points across an inset perimeter (between 3% and 12% from edges)
  const insetX = Math.max(2, Math.floor(width * 0.04));
  const insetY = Math.max(2, Math.floor(height * 0.04));
  const samples: { r: number; g: number; b: number; lum: number }[] = [];

  const addSample = (x: number, y: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      samples.push({ r, g, b, lum });
    }
  };

  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const px = Math.floor(insetX + (i / steps) * (width - 2 * insetX));
    const py = Math.floor(insetY + (i / steps) * (height - 2 * insetY));
    addSample(px, insetY); // Top inset line
    addSample(px, height - 1 - insetY); // Bottom inset line
    addSample(insetX, py); // Left inset line
    addSample(width - 1 - insetX, py); // Right inset line
  }

  // Filter out dark pixels (shadows / scanner edges, lum < 90)
  const brightSamples = samples.filter((s) => s.lum >= 90);
  const targetSamples = brightSamples.length > 10 ? brightSamples : samples;

  if (targetSamples.length === 0) {
    return { r: 255, g: 255, b: 255 };
  }

  // Find median luminance sample for robust background color
  targetSamples.sort((a, b) => a.lum - b.lum);
  const medianSample = targetSamples[Math.floor(targetSamples.length / 2)];

  return { r: medianSample.r, g: medianSample.g, b: medianSample.b };
}

/**
 * Robust content boundary analysis (Auto-Crop 2.0).
 * Features:
 * - Anti-black-border edge exclusion (ignores outer 1.5% edge frame artifacts).
 * - Horizontal and vertical line projection profiling to discard isolated noise/dust dots.
 */
export function analyzeContentBounds(
  buffer: PixelBuffer,
  threshold = 30,
): { minX: number; maxX: number; minY: number; maxY: number; contentRatio: number } | null {
  const { data, width, height } = buffer;
  if (width <= 0 || height <= 0) return null;

  const bg = estimateBackgroundColor(buffer);
  const totalPixels = width * height;

  // Ignore outermost 1.5% pixels to filter out scanner frame lines
  const borderMarginX = Math.max(2, Math.floor(width * 0.015));
  const borderMarginY = Math.max(2, Math.floor(height * 0.015));

  // Compute row and column projection profiles
  const rowCounts = new Uint32Array(height);
  const colCounts = new Uint32Array(width);
  let contentPixels = 0;

  for (let y = borderMarginY; y < height - borderMarginY; y++) {
    const rowOffset = y * width;
    for (let x = borderMarginX; x < width - borderMarginX; x++) {
      const idx = (rowOffset + x) * 4;
      const dr = Math.abs(data[idx] - bg.r);
      const dg = Math.abs(data[idx + 1] - bg.g);
      const db = Math.abs(data[idx + 2] - bg.b);

      if (dr + dg + db > threshold * 3) {
        rowCounts[y]++;
        colCounts[x]++;
        contentPixels++;
      }
    }
  }

  if (contentPixels === 0) {
    return null;
  }

  // Profile density threshold: a valid text row/column should have at least 0.5% content pixels
  const minRowDensity = Math.max(2, Math.floor(width * 0.005));
  const minColDensity = Math.max(2, Math.floor(height * 0.005));

  let minY = borderMarginY;
  while (minY < height - borderMarginY && rowCounts[minY] < minRowDensity) {
    minY++;
  }

  let maxY = height - borderMarginY - 1;
  while (maxY > minY && rowCounts[maxY] < minRowDensity) {
    maxY--;
  }

  let minX = borderMarginX;
  while (minX < width - borderMarginX && colCounts[minX] < minColDensity) {
    minX++;
  }

  let maxX = width - borderMarginX - 1;
  while (maxX > minX && colCounts[maxX] < minColDensity) {
    maxX--;
  }

  if (maxX <= minX || maxY <= minY) {
    return null;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    contentRatio: contentPixels / totalPixels,
  };
}

/**
 * Detect content boundaries using high-contrast edge detection (Auto-Crop 2.0).
 *
 * @param documentProxy - pdf.js document proxy
 * @param sourceId - 0-based source page index
 * @param marginPt - Optional margin in PDF points to add around detected content
 * @param threshold - Minimum pixel difference from background (0-255), default 30
 */
export async function detectAutoCrop(
  documentProxy: PDFDocumentProxy,
  sourceId: number,
  marginPt = 0,
  threshold = 30,
): Promise<AutoCropResult> {
  const page = await documentProxy.getPage(sourceId + 1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = SCAN_SCALE;
  const scanViewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    page.cleanup();
    return { cropRect: null, confidence: 0 };
  }

  canvas.width = Math.max(1, Math.floor(scanViewport.width));
  canvas.height = Math.max(1, Math.floor(scanViewport.height));

  await page.render({
    canvas,
    canvasContext: context,
    viewport: scanViewport,
  }).promise;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = analyzeContentBounds(imageData, threshold);

  page.cleanup();

  if (!bounds) {
    return { cropRect: null, confidence: 0 };
  }

  const { minX, maxX, minY, maxY, contentRatio } = bounds;

  // Convert pixel coordinates back to PDF points
  const scaleDown = 1 / SCAN_SCALE;
  const pageHeightPt = viewport.height;
  const pageWidthPt = viewport.width;

  const pdfMinX = minX * scaleDown;
  const pdfMaxX = maxX * scaleDown;
  const pdfMaxY = pageHeightPt - minY * scaleDown; // Canvas top -> PDF top
  const pdfMinY = pageHeightPt - maxY * scaleDown; // Canvas bottom -> PDF bottom

  const rawWidth = pdfMaxX - pdfMinX;
  const rawHeight = pdfMaxY - pdfMinY;

  // Add optional margin
  const cropX = Math.max(0, pdfMinX - marginPt);
  const cropY = Math.max(0, pdfMinY - marginPt);
  const cropWidth = Math.min(pageWidthPt - cropX, rawWidth + marginPt * 2);
  const cropHeight = Math.min(pageHeightPt - cropY, rawHeight + marginPt * 2);

  // Confidence calculation
  const sizeRatio = Math.min(rawWidth / pageWidthPt, rawHeight / pageHeightPt);
  const confidence = Math.min(1, Math.max(0.2, contentRatio * 15 * sizeRatio * 6));

  return {
    cropRect: {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    },
    confidence,
  };
}
