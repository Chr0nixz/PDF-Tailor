import { PDFDocument } from "pdf-lib";
import type { CropRect, PageCropState, WorkerExportPayload } from "@/types";
import { isQuarterTurnRotation } from "@/utils/documentWarnings";

interface ExportProgressEvent {
  completedPages: number;
  totalPages: number;
  stage: "processing" | "saving";
}

interface ExportPdfOptions {
  onProgress?: (event: ExportProgressEvent) => void;
}

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
  return exportWithCropBoxesAndProgress(payload);
}

function getTargetPageIndices(payload: WorkerExportPayload, totalPages: number) {
  const requestedIndices = payload.exportPageIndices;

  if (!requestedIndices || requestedIndices.length === 0) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  return [...new Set(requestedIndices)]
    .filter((pageIndex) => pageIndex >= 0 && pageIndex < totalPages)
    .sort((left, right) => left - right);
}

async function exportWithCropBoxesAndProgress(
  payload: WorkerExportPayload,
  options?: ExportPdfOptions,
) {
  const sourceDoc = await PDFDocument.load(payload.fileBuffer);
  const outputDoc = await PDFDocument.create();
  const sourcePages = sourceDoc.getPages();
  const targetPageIndices = getTargetPageIndices(payload, sourcePages.length);

  for (let index = 0; index < targetPageIndices.length; index += 1) {
    const sourcePageIndex = targetPageIndices[index];
    const [copiedPage] = await outputDoc.copyPages(sourceDoc, [sourcePageIndex]);
    const cropRect = getValidCropRect(payload.pageCrops[sourcePageIndex]);

    if (cropRect) {
      copiedPage.setCropBox(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      copiedPage.setMediaBox(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    }

    outputDoc.addPage(copiedPage);
    options?.onProgress?.({
      completedPages: index + 1,
      totalPages: targetPageIndices.length,
      stage: "processing",
    });
  }

  options?.onProgress?.({
    completedPages: targetPageIndices.length,
    totalPages: targetPageIndices.length,
    stage: "saving",
  });

  return new Uint8Array(await outputDoc.save());
}

async function exportWithRedraw(payload: WorkerExportPayload, options?: ExportPdfOptions) {
  const sourceDoc = await PDFDocument.load(payload.fileBuffer);
  const outputDoc = await PDFDocument.create();
  const sourcePages = sourceDoc.getPages();
  const targetPageIndices = getTargetPageIndices(payload, sourcePages.length);

  for (let index = 0; index < targetPageIndices.length; index += 1) {
    const pageIndex = targetPageIndices[index];
    const cropRect = getValidCropRect(payload.pageCrops[pageIndex]);
    const rotation = sourcePages[pageIndex]?.getRotation().angle ?? 0;

    if (!cropRect) {
      const [copiedPage] = await outputDoc.copyPages(sourceDoc, [pageIndex]);
      outputDoc.addPage(copiedPage);
      options?.onProgress?.({
        completedPages: index + 1,
        totalPages: targetPageIndices.length,
        stage: "processing",
      });
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

    options?.onProgress?.({
      completedPages: index + 1,
      totalPages: targetPageIndices.length,
      stage: "processing",
    });
  }

  options?.onProgress?.({
    completedPages: targetPageIndices.length,
    totalPages: targetPageIndices.length,
    stage: "saving",
  });

  return new Uint8Array(await outputDoc.save());
}

export async function exportPdf(
  payload: WorkerExportPayload,
  options?: ExportPdfOptions,
): Promise<Uint8Array> {
  if (payload.exportMode === "redraw") {
    return exportWithRedraw(payload, options);
  }

  return exportWithCropBoxesAndProgress(payload, options);
}
