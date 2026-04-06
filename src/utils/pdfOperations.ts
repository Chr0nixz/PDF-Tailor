import { PDFDocument } from "pdf-lib";
import type { CropRect, PageCropState, WorkerExportPayload } from "@/types";
import { isQuarterTurnRotation } from "@/utils/documentWarnings";

function getValidCropRect(pageCrop: PageCropState | undefined): CropRect | null {
  const cropRect = pageCrop?.cropRect;

  if (!cropRect) {
    return null;
  }

  if (cropRect.width <= 0 || cropRect.height <= 0) {
    throw new Error(`Invalid crop size on page ${cropRect.pageIndex + 1}.`);
  }

  return cropRect;
}

async function exportWithCropBoxes(payload: WorkerExportPayload) {
  const pdfDoc = await PDFDocument.load(payload.fileBuffer);
  const pages = pdfDoc.getPages();

  pages.forEach((page, pageIndex) => {
    const cropRect = getValidCropRect(payload.pageCrops[pageIndex]);

    if (!cropRect) {
      return;
    }

    page.setCropBox(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    page.setMediaBox(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
  });

  return new Uint8Array(await pdfDoc.save());
}

async function exportWithRedraw(payload: WorkerExportPayload) {
  const sourceDoc = await PDFDocument.load(payload.fileBuffer);
  const outputDoc = await PDFDocument.create();
  const sourcePages = sourceDoc.getPages();

  for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex += 1) {
    const cropRect = getValidCropRect(payload.pageCrops[pageIndex]);
    const rotation = sourcePages[pageIndex]?.getRotation().angle ?? 0;

    if (!cropRect) {
      const [copiedPage] = await outputDoc.copyPages(sourceDoc, [pageIndex]);
      outputDoc.addPage(copiedPage);
      continue;
    }

    if (isQuarterTurnRotation(rotation)) {
      throw new Error(
        `Redraw export does not support cropped rotated pages yet (page ${pageIndex + 1}). Use Crop box mode instead.`,
      );
    }

    const embeddedPage = await outputDoc.embedPage(sourcePages[pageIndex], {
      left: cropRect.x,
      right: cropRect.x + cropRect.width,
      bottom: cropRect.y,
      top: cropRect.y + cropRect.height,
    });

    const nextPage = outputDoc.addPage([cropRect.width, cropRect.height]);
    nextPage.drawPage(embeddedPage, {
      x: 0,
      y: 0,
      width: cropRect.width,
      height: cropRect.height,
    });
  }

  return new Uint8Array(await outputDoc.save());
}

export async function exportPdf(payload: WorkerExportPayload): Promise<Uint8Array> {
  if (payload.exportMode === "redraw") {
    return exportWithRedraw(payload);
  }

  return exportWithCropBoxes(payload);
}
