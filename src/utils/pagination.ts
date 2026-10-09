import { degrees, rgb, StandardFonts, type PDFDocument, type PDFPage } from "pdf-lib";
import type { PageNumberFormat, PageNumberPosition, PaginationConfig } from "@/types";

export function formatPageNumber(
  current: number,
  total: number,
  format: PageNumberFormat = "page-n-of-total",
): string {
  switch (format) {
    case "number-only":
      return `${current}`;
    case "slash-total":
      return `${current} / ${total}`;
    case "page-n-of-total":
    default:
      return `Page ${current} of ${total}`;
  }
}

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computePageNumberCoordinates(
  box: BoxRect,
  textWidth: number,
  fontSize: number,
  marginPt: number,
  position: PageNumberPosition,
): { x: number; y: number } {
  let x: number;
  let y: number;

  switch (position) {
    case "bottom-left":
      x = box.x + marginPt;
      y = box.y + marginPt;
      break;
    case "bottom-right":
      x = box.x + box.width - marginPt - textWidth;
      y = box.y + marginPt;
      break;
    case "top-left" as any:
      x = box.x + marginPt;
      y = box.y + box.height - marginPt - fontSize;
      break;
    case "top-right":
      x = box.x + box.width - marginPt - textWidth;
      y = box.y + box.height - marginPt - fontSize;
      break;
    case "top-center":
      x = box.x + Math.max(0, (box.width - textWidth) / 2);
      y = box.y + box.height - marginPt - fontSize;
      break;
    case "bottom-center":
    default:
      x = box.x + Math.max(0, (box.width - textWidth) / 2);
      y = box.y + marginPt;
      break;
  }

  return { x, y };
}

export function computeRotatedPaginationDrawOptions(
  box: BoxRect,
  textWidth: number,
  fontSize: number,
  marginPt: number,
  position: PageNumberPosition,
  rotationAngle = 0,
): { x: number; y: number; rotate: ReturnType<typeof degrees> } {
  const normAngle = ((rotationAngle % 360) + 360) % 360;

  if (normAngle === 0) {
    const coords = computePageNumberCoordinates(box, textWidth, fontSize, marginPt, position);
    return {
      x: Math.max(box.x, Math.min(box.x + box.width - textWidth, coords.x)),
      y: Math.max(box.y, Math.min(box.y + box.height - fontSize, coords.y)),
      rotate: degrees(0),
    };
  }

  const isPerpendicular = normAngle === 90 || normAngle === 270;
  const visualW = isPerpendicular ? box.height : box.width;
  const visualH = isPerpendicular ? box.width : box.height;
  const visualBox: BoxRect = { x: 0, y: 0, width: visualW, height: visualH };

  const visualCoords = computePageNumberCoordinates(
    visualBox,
    textWidth,
    fontSize,
    marginPt,
    position,
  );
  const vx = visualCoords.x;
  const vy = visualCoords.y;

  let px = box.x;
  let py = box.y;

  if (normAngle === 90) {
    px = box.x + box.width - vy;
    py = box.y + vx;
    return {
      x: Math.max(box.x, Math.min(box.x + box.width, px)),
      y: Math.max(box.y, Math.min(box.y + box.height, py)),
      rotate: degrees(90),
    };
  }

  if (normAngle === 180) {
    px = box.x + box.width - vx;
    py = box.y + box.height - vy;
    return {
      x: Math.max(box.x, Math.min(box.x + box.width, px)),
      y: Math.max(box.y, Math.min(box.y + box.height, py)),
      rotate: degrees(180),
    };
  }

  if (normAngle === 270) {
    px = box.x + vy;
    py = box.y + box.height - vx;
    return {
      x: Math.max(box.x, Math.min(box.x + box.width, px)),
      y: Math.max(box.y, Math.min(box.y + box.height, py)),
      rotate: degrees(270),
    };
  }

  return {
    x: box.x,
    y: box.y,
    rotate: degrees(0),
  };
}

/**
 * Overlay sequential page numbers across all pages in the PDF document.
 */
export async function applyPaginationToDocument(
  doc: PDFDocument,
  config?: PaginationConfig,
): Promise<void> {
  if (!config || !config.enabled) {
    return;
  }

  const pages = doc.getPages();
  const total = pages.length;
  if (total === 0) {
    return;
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = Math.max(6, Math.min(24, config.fontSizePt ?? 9));
  const marginPt = Math.max(4, Math.min(100, config.marginPt ?? 18));
  const startNumber = Math.max(1, config.startNumber ?? 1);
  const textColor = rgb(0.25, 0.25, 0.28);

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const currentNum = startNumber + i;
    const text = formatPageNumber(currentNum, startNumber + total - 1, config.format);
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    // Prefer cropBox if set, fallback to mediaBox
    const cropBox = page.getCropBox();
    const mediaBox = page.getMediaBox();
    const effectiveBox: BoxRect = {
      x: cropBox ? cropBox.x : mediaBox.x,
      y: cropBox ? cropBox.y : mediaBox.y,
      width: cropBox ? cropBox.width : mediaBox.width,
      height: cropBox ? cropBox.height : mediaBox.height,
    };

    const rotationAngle = page.getRotation().angle;
    const drawOptions = computeRotatedPaginationDrawOptions(
      effectiveBox,
      textWidth,
      fontSize,
      marginPt,
      config.position,
      rotationAngle,
    );

    page.drawText(text, {
      x: drawOptions.x,
      y: drawOptions.y,
      rotate: drawOptions.rotate,
      size: fontSize,
      font,
      color: textColor,
    });
  }
}
