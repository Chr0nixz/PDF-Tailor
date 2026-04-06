import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { exportPdf } from "@/utils/pdfOperations";
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

    await expect(exportPdf(payload)).rejects.toThrow("Invalid crop size on page 1.");
  });
});
