import { describe, expect, it } from "vitest";
import { degrees, PDFDocument } from "pdf-lib";
import {
  applyPaginationToDocument,
  computePageNumberCoordinates,
  computeRotatedPaginationDrawOptions,
  formatPageNumber,
} from "@/utils/pagination";

describe("pagination", () => {
  it("formats page numbers according to different format templates", () => {
    expect(formatPageNumber(1, 10, "number-only")).toBe("1");
    expect(formatPageNumber(3, 10, "page-n-of-total")).toBe("Page 3 of 10");
    expect(formatPageNumber(5, 20, "slash-total")).toBe("5 / 20");
  });

  it("computes accurate coordinates for positions", () => {
    const box = { x: 50, y: 100, width: 400, height: 600 };
    const textWidth = 60;
    const fontSize = 10;
    const margin = 20;

    // Bottom center: x centered in box, y = box.y + margin
    const bottomCenter = computePageNumberCoordinates(box, textWidth, fontSize, margin, "bottom-center");
    expect(bottomCenter.x).toBe(50 + (400 - 60) / 2); // 220
    expect(bottomCenter.y).toBe(120);

    // Bottom right: x = box.x + width - margin - textWidth
    const bottomRight = computePageNumberCoordinates(box, textWidth, fontSize, margin, "bottom-right");
    expect(bottomRight.x).toBe(50 + 400 - 20 - 60); // 370
    expect(bottomRight.y).toBe(120);

    // Top right: y = box.y + height - margin - fontSize
    const topRight = computePageNumberCoordinates(box, textWidth, fontSize, margin, "top-right");
    expect(topRight.x).toBe(370);
    expect(topRight.y).toBe(100 + 600 - 20 - 10); // 670
  });

  it("draws page numbers on real PDFDocument without throwing errors", async () => {
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([500, 800]);
    const p2 = doc.addPage([500, 800]);

    p1.setCropBox(50, 50, 400, 700);

    await applyPaginationToDocument(doc, {
      enabled: true,
      position: "bottom-center",
      format: "page-n-of-total",
      fontSizePt: 9,
      marginPt: 15,
      startNumber: 1,
    });

    const pdfBytes = await doc.save();
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("calculates accurate rotated coordinates and angles for 90-degree rotated pages", () => {
    // Physical box: width 600, height 400.
    // In 90-degree clockwise rotated view: visual width is 400, visual height is 600.
    const box = { x: 0, y: 0, width: 600, height: 400 };
    const textWidth = 60;
    const fontSize = 10;
    const margin = 20;

    const rotatedOptions = computeRotatedPaginationDrawOptions(
      box,
      textWidth,
      fontSize,
      margin,
      "bottom-center",
      90,
    );

    expect(rotatedOptions.rotate.angle).toBe(90);
    expect(rotatedOptions.x).toBeGreaterThan(0);
    expect(rotatedOptions.y).toBeGreaterThan(0);
  });
});
