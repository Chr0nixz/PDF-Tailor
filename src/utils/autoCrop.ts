import type { PDFDocumentProxy } from "@/lib/pdfjs";

/** Result of auto-crop detection. */
export interface AutoCropResult {
  /** Crop rectangle in PDF points (origin top-left, y increases downward). */
  cropRect: { x: number; y: number; width: number; height: number } | null;
  /** Confidence score 0-1; below 0.5 suggests manual review. */
  confidence: number;
}

const SCAN_SCALE = 2; // render at 2x for quality

/**
 * Detect content boundaries using high-contrast edge detection.
 * Works best on scanned documents with uniform background.
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
  const { data, width, height } = imageData;

  // Step 1: Sample background color — use top-left 10x10 region average
  let bgR = 0, bgG = 0, bgB = 0;
  let bgCount = 0;
  const sampleSize = Math.min(10, width, height);
  for (let y = 0; y < sampleSize; y++) {
    for (let x = 0; x < sampleSize; x++) {
      const i = (y * width + x) * 4;
      bgR += data[i];
      bgG += data[i + 1];
      bgB += data[i + 2];
      bgCount++;
    }
  }
  bgR = Math.round(bgR / bgCount);
  bgG = Math.round(bgG / bgCount);
  bgB = Math.round(bgB / bgCount);

  // Step 2: Find content bounding box — pixels that differ significantly from background
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let contentPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(data[i] - bgR);
      const dg = Math.abs(data[i + 1] - bgG);
      const db = Math.abs(data[i + 2] - bgB);

      if (dr + dg + db > threshold * 3) {
        contentPixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  page.cleanup();

  if (contentPixels === 0 || maxX <= minX || maxY <= minY) {
    return { cropRect: null, confidence: 0 };
  }

  // Convert pixel coordinates back to PDF points (1-to-1 at scale=1)
  const scaleDown = 1 / SCAN_SCALE;

  // PDF coordinate origin is bottom-left; canvas origin is top-left.
  // PDF y = (pageHeight - canvasY) in points.
  const pageHeightPt = viewport.height;
  const pageWidthPt = viewport.width;

  const pdfMinX = minX * scaleDown;
  const pdfMaxX = maxX * scaleDown;
  const pdfMaxY = pageHeightPt - minY * scaleDown; // canvas top → PDF top → bottom in PDF coords
  const pdfMinY = pageHeightPt - maxY * scaleDown;

  const rawWidth = pdfMaxX - pdfMinX;
  const rawHeight = pdfMaxY - pdfMinY;

  // Add optional margin (in PDF points)
  const cropX = Math.max(0, pdfMinX - marginPt);
  const cropY = Math.max(0, pdfMinY - marginPt);
  const cropWidth = Math.min(pageWidthPt - cropX, rawWidth + marginPt * 2);
  const cropHeight = Math.min(pageHeightPt - cropY, rawHeight + marginPt * 2);

  // Confidence: ratio of content pixels vs total, clamped 0-1
  const totalPixels = width * height;
  const contentRatio = contentPixels / totalPixels;
  // Penalize if detected content is very small or very large
  const sizeRatio = Math.min(rawWidth / pageWidthPt, rawHeight / pageHeightPt);
  const confidence = Math.min(1, Math.max(0, contentRatio * 10 * sizeRatio * 10));

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
