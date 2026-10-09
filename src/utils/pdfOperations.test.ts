import { degrees, PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { computeRedrawConfig, exportPdf } from "@/utils/pdfOperations";
import type { PageCropState, WorkerExportPayload } from "@/types";

function createPageCrop(
  pageIndex: number,
  cropRect: PageCropState["cropRect"],
): PageCropState {
  return {
    pageIndex,
    cropRect,
    mode: "free",
    marginsPt: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    updatedAt: Date.now(),
  };
}

async function createSourcePdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const firstPage = pdfDoc.addPage([400, 600]);
  firstPage.drawText("Page 1", {
    x: 24,
    y: 560,
    size: 20,
    font,
    color: rgb(0.1, 0.2, 0.3),
  });

  const secondPage = pdfDoc.addPage([500, 700]);
  secondPage.drawText("Page 2", {
    x: 24,
    y: 660,
    size: 20,
    font,
    color: rgb(0.2, 0.3, 0.1),
  });

  return new Uint8Array(await pdfDoc.save());
}

async function createRotatedSourcePdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([400, 600]);
  page.setRotation(degrees(90));
  page.drawText("Rotated text", {
    x: 50,
    y: 50,
    size: 14,
    font,
  });
  return new Uint8Array(await pdfDoc.save());
}

async function buildPayload(
  exportMode: WorkerExportPayload["exportMode"],
  pageCrops: Record<number, PageCropState>,
): Promise<WorkerExportPayload> {
  return {
    fileBuffer: await createSourcePdf(),
    pageCrops,
    exportMode,
  };
}

describe("pdfOperations", () => {
  it("applies crop and media boxes in crop-box mode", async () => {
    const payload = await buildPayload("crop-box", {
      0: createPageCrop(0, {
        pageIndex: 0,
        x: 20,
        y: 30,
        width: 150,
        height: 220,
      }),
    });

    const exported = await exportPdf(payload);
    const document = await PDFDocument.load(exported);
    const pages = document.getPages();

    expect(pages).toHaveLength(2);

    expect(pages[0].getCropBox()).toMatchObject({
      x: 20,
      y: 30,
      width: 150,
      height: 220,
    });
    expect(pages[0].getMediaBox()).toMatchObject({
      x: 20,
      y: 30,
      width: 150,
      height: 220,
    });
    expect(pages[1].getSize()).toEqual({ width: 500, height: 700 });
  });

  it("redraws cropped pages to the final crop size and preserves untouched pages", async () => {
    const payload = await buildPayload("redraw", {
      0: createPageCrop(0, {
        pageIndex: 0,
        x: 50,
        y: 40,
        width: 180,
        height: 260,
      }),
    });

    const exported = await exportPdf(payload);
    const document = await PDFDocument.load(exported);
    const pages = document.getPages();

    expect(pages).toHaveLength(2);
    expect(pages[0].getSize()).toEqual({ width: 180, height: 260 });
    expect(pages[1].getSize()).toEqual({ width: 500, height: 700 });
  });

  it("keeps original geometry when no crop settings exist", async () => {
    const payload = await buildPayload("crop-box", {});

    const exported = await exportPdf(payload);
    const document = await PDFDocument.load(exported);
    const pages = document.getPages();

    expect(pages[0].getSize()).toEqual({ width: 400, height: 600 });
    expect(pages[1].getSize()).toEqual({ width: 500, height: 700 });
  });

  it("exports only the requested page subset in crop-box mode", async () => {
    const payload = await buildPayload("crop-box", {
      1: createPageCrop(1, {
        pageIndex: 1,
        x: 30,
        y: 40,
        width: 200,
        height: 260,
      }),
    });
    payload.exportPageIndices = [1];

    const exported = await exportPdf(payload);
    const document = await PDFDocument.load(exported);
    const pages = document.getPages();

    expect(pages).toHaveLength(1);
    expect(pages[0].getCropBox()).toMatchObject({
      x: 30,
      y: 40,
      width: 200,
      height: 260,
    });
  });

  it("exports only the requested page subset in redraw mode", async () => {
    const payload = await buildPayload("redraw", {
      1: createPageCrop(1, {
        pageIndex: 1,
        x: 60,
        y: 50,
        width: 210,
        height: 280,
      }),
    });
    payload.exportPageIndices = [1];

    const exported = await exportPdf(payload);
    const document = await PDFDocument.load(exported);
    const pages = document.getPages();

    expect(pages).toHaveLength(1);
    expect(pages[0].getSize()).toEqual({ width: 210, height: 280 });
  });

  it("rejects invalid crop rectangles", async () => {
    const payload = await buildPayload("redraw", {
      0: createPageCrop(0, {
        pageIndex: 0,
        x: 10,
        y: 20,
        width: 0,
        height: 80,
      }),
    });

    await expect(exportPdf(payload)).rejects.toThrow("第 1 页的裁剪尺寸无效。");
  });

  it("successfully redraws cropped rotated pages with correct orientation and size", async () => {
    const payload: WorkerExportPayload = {
      fileBuffer: await createRotatedSourcePdf(),
      exportMode: "redraw",
      pageCrops: {
        0: createPageCrop(0, {
          pageIndex: 0,
          x: 20,
          y: 30,
          width: 120,
          height: 180,
        }),
      },
    };

    const exported = await exportPdf(payload);
    const document = await PDFDocument.load(exported);
    const pages = document.getPages();

    expect(pages).toHaveLength(1);
    expect(pages[0].getSize()).toEqual({ width: 120, height: 180 });
  });

  it("preserves custom reordered page sequence in crop-box export", async () => {
    const payload = await buildPayload("crop-box", {});
    // Reorder pages in reverse: page 2 (index 1), then page 1 (index 0)
    payload.exportPageIndices = [1, 0];

    const exported = await exportPdf(payload);
    const document = await PDFDocument.load(exported);
    const pages = document.getPages();

    expect(pages).toHaveLength(2);
    // Original Page 2 has width 500, height 700
    expect(pages[0].getSize()).toEqual({ width: 500, height: 700 });
    // Original Page 1 has width 400, height 600
    expect(pages[1].getSize()).toEqual({ width: 400, height: 600 });
  });

  it("preserves custom reordered page sequence in redraw export", async () => {
    const payload = await buildPayload("redraw", {});
    payload.exportPageIndices = [1, 0];

    const exported = await exportPdf(payload);
    const document = await PDFDocument.load(exported);
    const pages = document.getPages();

    expect(pages).toHaveLength(2);
    expect(pages[0].getSize()).toEqual({ width: 500, height: 700 });
    expect(pages[1].getSize()).toEqual({ width: 400, height: 600 });
  });

  describe("computeRedrawConfig", () => {
    const cropRect = { pageIndex: 0, x: 20, y: 30, width: 100, height: 150 };

    it("calculates correct bounding box and draw options for 0 rotation", () => {
      const config = computeRedrawConfig(cropRect, 400, 600, 0);
      expect(config.pageSize).toEqual([100, 150]);
      expect(config.boundingBox).toEqual({ left: 20, bottom: 30, right: 120, top: 180 });
      expect(config.drawOptions).toEqual({ x: 0, y: 0, width: 100, height: 150 });
    });

    it("calculates correct bounding box and rotation for 90 rotation", () => {
      const config = computeRedrawConfig(cropRect, 400, 600, 90);
      expect(config.pageSize).toEqual([100, 150]);
      expect(config.boundingBox.left).toBe(400 - 30 - 150); // 220
      expect(config.boundingBox.bottom).toBe(20);
      expect(config.boundingBox.right).toBe(400 - 30); // 370
      expect(config.boundingBox.top).toBe(20 + 100); // 120
      expect(config.drawOptions.x).toBe(0);
      expect(config.drawOptions.y).toBe(150);
      expect(config.drawOptions.rotate?.angle).toBe(270);
    });

    it("calculates correct bounding box and rotation for 180 rotation", () => {
      const config = computeRedrawConfig(cropRect, 400, 600, 180);
      expect(config.pageSize).toEqual([100, 150]);
      expect(config.boundingBox.left).toBe(400 - 20 - 100); // 280
      expect(config.boundingBox.bottom).toBe(600 - 30 - 150); // 420
      expect(config.drawOptions.rotate?.angle).toBe(180);
    });

    it("calculates correct bounding box and rotation for 270 rotation", () => {
      const config = computeRedrawConfig(cropRect, 400, 600, 270);
      expect(config.pageSize).toEqual([100, 150]);
      expect(config.boundingBox.left).toBe(30);
      expect(config.boundingBox.bottom).toBe(600 - 20 - 100); // 480
      expect(config.drawOptions.rotate?.angle).toBe(90);
    });

    it("clamps bounding box within original dimensions on overflow", () => {
      const overflowRect = { pageIndex: 0, x: -10, y: -20, width: 500, height: 800 };
      const config = computeRedrawConfig(overflowRect, 400, 600, 0);
      expect(config.boundingBox.left).toBe(0);
      expect(config.boundingBox.bottom).toBe(0);
      expect(config.boundingBox.right).toBe(400);
      expect(config.boundingBox.top).toBe(600);
    });
  });

  describe("column split export", () => {
    it("splits a single page into two sequential pages in crop-box export", async () => {
      const payload: WorkerExportPayload = {
        fileBuffer: await createSourcePdf(),
        exportMode: "crop-box",
        exportPageIndices: [0], // Only export page 0
        pageCrops: {
          0: {
            pageIndex: 0,
            cropRect: { x: 50, y: 100, width: 200, height: 300, pageIndex: 0 },
            mode: "free",
            marginsPt: { top: 0, right: 0, bottom: 0, left: 0 },
            updatedAt: Date.now(),
            splitConfig: {
              direction: "vertical",
              splitRatio: 0.5,
              gutterPt: 0,
            },
          },
        },
      };

      const exported = await exportPdf(payload);
      const document = await PDFDocument.load(exported);
      const pages = document.getPages();

      // 1 source page split into 2 output pages
      expect(pages).toHaveLength(2);
      expect(pages[0].getCropBox()).toMatchObject({ x: 50, y: 100, width: 100, height: 300 });
      expect(pages[1].getCropBox()).toMatchObject({ x: 150, y: 100, width: 100, height: 300 });
    });

    it("splits a single page into two correctly sized pages in redraw export", async () => {
      const payload: WorkerExportPayload = {
        fileBuffer: await createSourcePdf(),
        exportMode: "redraw",
        exportPageIndices: [0],
        pageCrops: {
          0: {
            pageIndex: 0,
            cropRect: { x: 50, y: 100, width: 200, height: 300, pageIndex: 0 },
            mode: "free",
            marginsPt: { top: 0, right: 0, bottom: 0, left: 0 },
            updatedAt: Date.now(),
            splitConfig: {
              direction: "vertical",
              splitRatio: 0.5,
              gutterPt: 0,
            },
          },
        },
      };

      const exported = await exportPdf(payload);
      const document = await PDFDocument.load(exported);
      const pages = document.getPages();

      expect(pages).toHaveLength(2);
      expect(pages[0].getSize()).toEqual({ width: 100, height: 300 });
      expect(pages[1].getSize()).toEqual({ width: 100, height: 300 });
    });
  });
});
