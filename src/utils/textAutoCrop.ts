import type { PDFDocumentProxy } from "@/lib/pdfjs";

export interface TextAutoCropResult {
  cropRect: { x: number; y: number; width: number; height: number } | null;
  textItemCount: number;
  confidence: number;
}

export interface RawTextItem {
  str: string;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, tx, ty]
  width: number;
  height?: number;
}

/**
 * Compute the bounding box of a list of text items in PDF points.
 * PDF coordinate system has origin (0, 0) at the bottom-left.
 */
export function computeTextItemsBoundingBox(
  items: RawTextItem[],
  pageWidthPt: number,
  pageHeightPt: number,
  marginPt = 0,
): TextAutoCropResult {
  const validItems = items.filter((item) => {
    if (typeof item.str !== "string" || item.str.trim().length === 0) {
      return false;
    }
    if (!Array.isArray(item.transform) || item.transform.length < 6) {
      return false;
    }
    return true;
  });

  if (validItems.length === 0) {
    return {
      cropRect: null,
      textItemCount: 0,
      confidence: 0,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const item of validItems) {
    const a = item.transform[0];
    const b = item.transform[1];
    const c = item.transform[2];
    const d = item.transform[3];
    const tx = item.transform[4];
    const ty = item.transform[5];

    const lenAB = Math.hypot(a, b) || 1;
    const lenCD = Math.hypot(c, d) || 1;

    // Normalized directional unit vectors along baseline (u) and ascender (v)
    const uX = a / lenAB;
    const uY = b / lenAB;
    const vX = c / lenCD;
    const vY = d / lenCD;

    const fontHeight = Math.max(
      6,
      item.height && item.height > 0
        ? item.height
        : lenCD > 0
        ? lenCD
        : 10,
    );
    const itemWidth = Math.max(0, item.width);

    // 4 corners of the glyph cluster in PDF coordinates
    const p0x = tx;
    const p0y = ty;
    const p1x = tx + uX * itemWidth;
    const p1y = ty + uY * itemWidth;
    const p2x = tx + uX * itemWidth + vX * fontHeight;
    const p2y = ty + uY * itemWidth + vY * fontHeight;
    const p3x = tx + vX * fontHeight;
    const p3y = ty + vY * fontHeight;

    const itemMinX = Math.min(p0x, p1x, p2x, p3x);
    const itemMaxX = Math.max(p0x, p1x, p2x, p3x);
    const itemMinY = Math.min(p0y, p1y, p2y, p3y);
    const itemMaxY = Math.max(p0y, p1y, p2y, p3y);

    if (itemMinX < minX) minX = itemMinX;
    if (itemMaxX > maxX) maxX = itemMaxX;
    if (itemMinY < minY) minY = itemMinY;
    if (itemMaxY > maxY) maxY = itemMaxY;
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY) ||
    maxX <= minX ||
    maxY <= minY
  ) {
    return {
      cropRect: null,
      textItemCount: validItems.length,
      confidence: 0,
    };
  }

  // Apply padding / margin and clamp inside the physical page box
  const clampedMinX = Math.max(0, Math.min(pageWidthPt, minX - marginPt));
  const clampedMaxX = Math.max(0, Math.min(pageWidthPt, maxX + marginPt));
  const clampedMinY = Math.max(0, Math.min(pageHeightPt, minY - marginPt));
  const clampedMaxY = Math.max(0, Math.min(pageHeightPt, maxY + marginPt));

  const width = Math.max(1, clampedMaxX - clampedMinX);
  const height = Math.max(1, clampedMaxY - clampedMinY);

  // Confidence increases with the number of text items found
  const confidence = Math.min(1, Math.max(0.5, validItems.length / 20));

  return {
    cropRect: {
      x: clampedMinX,
      y: clampedMinY,
      width,
      height,
    },
    textItemCount: validItems.length,
    confidence,
  };
}

/**
 * Inspect vector text glyphs on a PDF page and detect tight bounding box.
 */
export async function detectTextLayerAutoCrop(
  documentProxy: PDFDocumentProxy,
  sourceId: number,
  marginPt = 0,
): Promise<TextAutoCropResult> {
  const page = await documentProxy.getPage(sourceId + 1);
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  page.cleanup();

  const items: RawTextItem[] = [];
  for (const item of textContent.items) {
    if ("str" in item && "transform" in item) {
      items.push({
        str: item.str,
        transform: item.transform,
        width: item.width,
        height: (item as any).height,
      });
    }
  }

  return computeTextItemsBoundingBox(
    items,
    viewport.width,
    viewport.height,
    marginPt,
  );
}
